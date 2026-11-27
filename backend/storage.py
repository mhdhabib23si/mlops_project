import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Optional


DATABASE_PATH = Path(
    os.getenv("FEEDBACK_DB_PATH", str(Path(__file__).with_name("feedback.sqlite3")))
).expanduser()

SENTIMENT_KEYS = {
    "Positif": "positif",
    "Netral": "netral",
    "Negatif": "negatif",
}


@contextmanager
def _connect():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with _connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS feedback_imports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_hash TEXT NOT NULL UNIQUE,
                filename TEXT NOT NULL,
                imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS feedback_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                import_id INTEGER NOT NULL REFERENCES feedback_imports(id) ON DELETE CASCADE,
                source_row INTEGER NOT NULL,
                year INTEGER NOT NULL,
                text TEXT NOT NULL,
                original_category TEXT,
                sentiment TEXT NOT NULL,
                predicted_category TEXT NOT NULL,
                confidence REAL,
                label_source TEXT NOT NULL DEFAULT 'model',
                source_label_confidence TEXT,
                source_label_method TEXT,
                verification_status TEXT,
                UNIQUE(import_id, source_row)
            );
            """
        )
        columns = {
            row["name"]: row
            for row in connection.execute("PRAGMA table_info(feedback_comments)")
        }
        added_columns = {
            "label_source",
            "source_label_confidence",
            "source_label_method",
            "verification_status",
        }
        if columns["confidence"]["notnull"] or not added_columns.issubset(columns):
            connection.execute(
                """
                CREATE TABLE feedback_comments_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    import_id INTEGER NOT NULL REFERENCES feedback_imports(id) ON DELETE CASCADE,
                    source_row INTEGER NOT NULL,
                    year INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    original_category TEXT,
                    sentiment TEXT NOT NULL,
                    predicted_category TEXT NOT NULL,
                    confidence REAL,
                    label_source TEXT NOT NULL DEFAULT 'model',
                    source_label_confidence TEXT,
                    source_label_method TEXT,
                    verification_status TEXT,
                    UNIQUE(import_id, source_row)
                )
                """
            )
            expressions = {
                name: name if name in columns else default
                for name, default in {
                    "id": "NULL",
                    "import_id": "NULL",
                    "source_row": "NULL",
                    "year": "NULL",
                    "text": "NULL",
                    "original_category": "NULL",
                    "sentiment": "NULL",
                    "predicted_category": "NULL",
                    "confidence": "NULL",
                    "label_source": "'model'",
                    "source_label_confidence": "NULL",
                    "source_label_method": "NULL",
                    "verification_status": "NULL",
                }.items()
            }
            target_columns = ", ".join(expressions)
            source_columns = ", ".join(expressions.values())
            connection.execute(
                f"""
                INSERT INTO feedback_comments_new ({target_columns})
                SELECT {source_columns} FROM feedback_comments
                """
            )
            connection.execute("DROP TABLE feedback_comments")
            connection.execute(
                "ALTER TABLE feedback_comments_new RENAME TO feedback_comments"
            )

        connection.executescript(
            """
            CREATE INDEX IF NOT EXISTS idx_feedback_comments_year
                ON feedback_comments(year);
            CREATE INDEX IF NOT EXISTS idx_feedback_comments_category
                ON feedback_comments(predicted_category);
            CREATE INDEX IF NOT EXISTS idx_feedback_comments_sentiment
                ON feedback_comments(sentiment);
            """
        )


def _comment_rows(connection: sqlite3.Connection, import_id: int) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT id, year, text, original_category, sentiment,
               predicted_category AS category, confidence, label_source,
               source_label_confidence, source_label_method, verification_status
        FROM feedback_comments
        WHERE import_id = ?
        ORDER BY source_row
        """,
        (import_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def store_import(
    source_hash: str,
    filename: str,
    comments: list[dict[str, Any]],
) -> tuple[bool, list[dict[str, Any]]]:
    with _connect() as connection:
        connection.execute("BEGIN IMMEDIATE")
        existing = connection.execute(
            "SELECT id FROM feedback_imports WHERE source_hash = ?",
            (source_hash,),
        ).fetchone()
        if existing:
            return False, _comment_rows(connection, existing["id"])

        cursor = connection.execute(
            "INSERT INTO feedback_imports (source_hash, filename) VALUES (?, ?)",
            (source_hash, filename),
        )
        import_id = cursor.lastrowid
        connection.executemany(
            """
            INSERT INTO feedback_comments (
                import_id, source_row, year, text, original_category,
                sentiment, predicted_category, confidence, label_source,
                source_label_confidence, source_label_method, verification_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    import_id,
                    row["source_row"],
                    row["year"],
                    row["text"],
                    row.get("original_category"),
                    row["sentiment"],
                    row["category"],
                    row.get("confidence"),
                    row.get("label_source", "model"),
                    row.get("source_label_confidence"),
                    row.get("source_label_method"),
                    row.get("verification_status"),
                )
                for row in comments
            ],
        )
        return True, _comment_rows(connection, import_id)


def get_comments(
    limit: int = 20,
    offset: int = 0,
    year: Optional[int] = None,
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[list[dict[str, Any]], int]:
    conditions = []
    parameters: list[Any] = []
    if year is not None:
        conditions.append("year = ?")
        parameters.append(year)
    if category:
        conditions.append("LOWER(predicted_category) LIKE ?")
        parameters.append(f"%{category.lower()}%")
    if sentiment:
        conditions.append("LOWER(sentiment) = ?")
        parameters.append(sentiment.lower())
    if search:
        conditions.append("(LOWER(text) LIKE ? OR LOWER(predicted_category) LIKE ?)")
        search_pattern = f"%{search.lower()}%"
        parameters.extend((search_pattern, search_pattern))

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    with _connect() as connection:
        total = connection.execute(
            f"SELECT COUNT(*) FROM feedback_comments {where_clause}",
            parameters,
        ).fetchone()[0]
        rows = connection.execute(
            f"""
            SELECT id, year, text, original_category, sentiment,
                   predicted_category AS category, confidence, label_source,
                   source_label_confidence, source_label_method, verification_status
            FROM feedback_comments
            {where_clause}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            [*parameters, limit, offset],
        ).fetchall()
    return [dict(row) for row in rows], total


def get_dashboard_stats(
    year: Optional[int] = None,
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
) -> dict[str, Any]:
    conditions = []
    parameters: list[Any] = []
    if year is not None:
        conditions.append("year = ?")
        parameters.append(year)
    if category:
        conditions.append("LOWER(predicted_category) LIKE ?")
        parameters.append(f"%{category.lower()}%")
    if sentiment:
        conditions.append("LOWER(sentiment) = ?")
        parameters.append(sentiment.lower())
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with _connect() as connection:
        aggregates = connection.execute(
            f"""
            SELECT year, predicted_category, sentiment, COUNT(*) AS total
            FROM feedback_comments
            {where_clause}
            GROUP BY year, predicted_category, sentiment
            """,
            parameters,
        ).fetchall()
        available_years = [
            row["year"]
            for row in connection.execute(
                "SELECT DISTINCT year FROM feedback_comments ORDER BY year"
            ).fetchall()
        ]

    yearly_totals: dict[str, int] = {}
    yearly_sentiment: dict[str, dict[str, int]] = {}
    categories: dict[str, dict[str, Any]] = {}
    sentiment_totals = {"positif": 0, "netral": 0, "negatif": 0}
    total_comments = 0

    for row in aggregates:
        year_key = str(row["year"])
        category_name = row["predicted_category"]
        sentiment_key = SENTIMENT_KEYS.get(row["sentiment"])
        if sentiment_key is None:
            continue

        count = row["total"]
        total_comments += count
        sentiment_totals[sentiment_key] += count
        yearly_totals[year_key] = yearly_totals.get(year_key, 0) + count
        yearly_sentiment.setdefault(
            year_key, {"positif": 0, "netral": 0, "negatif": 0}
        )[sentiment_key] += count

        category_stats = categories.setdefault(
            category_name,
            {
                "name": category_name,
                "total": 0,
                "positif": 0,
                "netral": 0,
                "negatif": 0,
            },
        )
        category_stats["total"] += count
        category_stats[sentiment_key] += count

    return {
        "total_comments": total_comments,
        "total_positif": sentiment_totals["positif"],
        "total_netral": sentiment_totals["netral"],
        "total_negatif": sentiment_totals["negatif"],
        "available_years": available_years,
        "yearly_totals": yearly_totals,
        "yearly_sentiment": yearly_sentiment,
        "category_stats": list(categories.values()),
    }
