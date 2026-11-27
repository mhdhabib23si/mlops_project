import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import storage


class FeedbackStorageTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_dir.name) / "feedback.sqlite3"
        self.database_patch = patch.object(storage, "DATABASE_PATH", self.database_path)
        self.database_patch.start()
        storage.initialize_database()

    def tearDown(self):
        self.database_patch.stop()
        self.temp_dir.cleanup()

    def test_persists_real_records_and_calculates_statistics(self):
        records = [
            {
                "source_row": 1,
                "year": 2024,
                "text": "Komentar layanan kampus",
                "original_category": None,
                "sentiment": "Positif",
                "category": "Kemahasiswaan",
                "confidence": 0.9,
            },
            {
                "source_row": 2,
                "year": 2024,
                "text": "Komentar layanan kampus",
                "original_category": None,
                "sentiment": "Negatif",
                "category": "Sarana & Prasarana",
                "confidence": 0.8,
            },
        ]

        created, saved = storage.store_import("file-hash", "survei.csv", records)
        stats = storage.get_dashboard_stats()
        comments, total = storage.get_comments(limit=10)

        self.assertTrue(created)
        self.assertEqual(len(saved), 2)
        self.assertEqual(stats["total_comments"], 2)
        self.assertEqual(stats["total_positif"], 1)
        self.assertEqual(stats["total_negatif"], 1)
        self.assertEqual(stats["available_years"], [2024])
        self.assertEqual(total, 2)
        self.assertEqual(len(comments), 2)

    def test_same_file_is_not_imported_twice(self):
        record = {
            "source_row": 1,
            "year": 2025,
            "text": "Umpan balik asli",
            "original_category": None,
            "sentiment": "Netral",
            "category": "BAAK",
            "confidence": 0.7,
        }
        storage.store_import("same-hash", "survei.csv", [record])

        created, existing = storage.store_import("same-hash", "survei.csv", [record])
        stats = storage.get_dashboard_stats()

        self.assertFalse(created)
        self.assertEqual(len(existing), 1)
        self.assertEqual(stats["total_comments"], 1)

    def test_import_accepts_unknown_confidence_and_keeps_source_label_metadata(self):
        record = {
            "source_row": 1,
            "year": 2025,
            "text": "Komentar berlabel dari dataset",
            "original_category": "BAAK",
            "sentiment": "Positif",
            "category": "BAAK",
            "confidence": None,
            "label_source": "dataset",
            "source_label_confidence": "Tinggi",
            "source_label_method": "Aturan linguistik v2",
            "verification_status": "Belum diverifikasi manusia",
        }

        _, saved = storage.store_import("labeled-file", "dataset.csv", [record])
        comments, total = storage.get_comments()

        self.assertEqual(total, 1)
        self.assertIsNone(saved[0]["confidence"])
        self.assertEqual(saved[0]["label_source"], "dataset")
        self.assertEqual(comments[0]["source_label_confidence"], "Tinggi")
        self.assertEqual(
            comments[0]["verification_status"],
            "Belum diverifikasi manusia",
        )

    def test_initialize_migrates_legacy_confidence_constraint(self):
        legacy_path = Path(self.temp_dir.name) / "legacy.sqlite3"
        connection = sqlite3.connect(legacy_path)
        try:
            connection.executescript(
                """
                CREATE TABLE feedback_imports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_hash TEXT NOT NULL UNIQUE,
                    filename TEXT NOT NULL,
                    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE feedback_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    import_id INTEGER NOT NULL REFERENCES feedback_imports(id) ON DELETE CASCADE,
                    source_row INTEGER NOT NULL,
                    year INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    original_category TEXT,
                    sentiment TEXT NOT NULL,
                    predicted_category TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    UNIQUE(import_id, source_row)
                );
                INSERT INTO feedback_imports (id, source_hash, filename)
                VALUES (1, 'legacy-hash', 'legacy.csv');
                INSERT INTO feedback_comments (
                    import_id, source_row, year, text, sentiment,
                    predicted_category, confidence
                ) VALUES (1, 1, 2024, 'Data lama', 'Netral', 'BAAK', 0.75);
                """
            )
        finally:
            connection.close()

        with patch.object(storage, "DATABASE_PATH", legacy_path):
            storage.initialize_database()
            comments, total = storage.get_comments()

        self.assertEqual(total, 1)
        self.assertEqual(comments[0]["text"], "Data lama")
        self.assertEqual(comments[0]["confidence"], 0.75)
        self.assertEqual(comments[0]["label_source"], "model")


if __name__ == "__main__":
    unittest.main()
