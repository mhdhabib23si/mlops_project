import asyncio
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import main
import storage
from fastapi import UploadFile


class FixedAnalyzer:
    def __init__(self, key, value):
        self.key = key
        self.value = value

    def batch_predict(self, texts):
        return [
            {self.key: self.value, "confidence": 0.8}
            for _ in texts
        ]


class ImportPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_patch = patch.object(
            storage,
            "DATABASE_PATH",
            Path(self.temp_dir.name) / "feedback.sqlite3",
        )
        self.database_patch.start()
        storage.initialize_database()

    def tearDown(self):
        self.database_patch.stop()
        self.temp_dir.cleanup()

    def test_batch_import_persists_every_valid_row_and_is_idempotent(self):
        contents = (
            "Komentar,Tahun,Kategori Asli\n"
            "Umpan balik berulang,2024,BAAK\n"
            "Umpan balik berulang,2024,BAAK\n"
        ).encode("utf-8")
        upload = UploadFile(filename="survei.csv", file=io.BytesIO(contents))
        sentiment = FixedAnalyzer("sentiment", "Positif")
        category = FixedAnalyzer("category", "BAAK")

        with (
            patch.object(main, "sentiment_analyzer", sentiment),
            patch.object(main, "category_classifier", category),
        ):
            first = asyncio.run(main.batch_process(upload))
            second = asyncio.run(
                main.batch_process(
                    UploadFile(filename="survei.csv", file=io.BytesIO(contents))
                )
            )
            stats = asyncio.run(main.get_stats())
            filtered_stats = asyncio.run(main.get_stats(2024, "BAAK", "Positif"))

        self.assertEqual(first.processed, 2)
        self.assertEqual(first.status, "completed")
        self.assertEqual(second.status, "already_imported")
        self.assertEqual(stats.total_comments, 2)
        self.assertEqual(stats.total_positif, 2)
        self.assertEqual(stats.available_years, [2024])
        self.assertEqual(filtered_stats.total_comments, 2)

    def test_import_uses_labeled_snake_case_dataset_without_reclassification(self):
        contents = (
            "komentar,tahun,kategori_layanan,label_sentimen,keyakinan_label,"
            "metode_label,status_verifikasi\n"
            "Komentar layanan kampus,2025,Sistem dan Teknologi Informasi,"
            "Positif,Tinggi,Aturan linguistik revisi v2, Belum diverifikasi manusia\n"
        ).encode("utf-8")
        sentiment = MagicMock()
        category = MagicMock()

        with (
            patch.object(main, "sentiment_analyzer", sentiment),
            patch.object(main, "category_classifier", category),
        ):
            validated = asyncio.run(
                main.upload_file(
                    UploadFile(filename="dataset.csv", file=io.BytesIO(contents))
                )
            )
            result = asyncio.run(
                main.batch_process(
                    UploadFile(filename="dataset.csv", file=io.BytesIO(contents))
                )
            )

        saved = result.results[0]
        self.assertEqual(validated["valid_rows"], 1)
        self.assertEqual(saved.sentiment, "Positif")
        self.assertEqual(saved.category, "Sistem & TI")
        self.assertEqual(saved.original_category, "Sistem dan Teknologi Informasi")
        self.assertIsNone(saved.confidence)
        self.assertEqual(saved.label_source, "dataset")
        self.assertEqual(saved.source_label_confidence, "Tinggi")
        self.assertEqual(
            saved.verification_status,
            "Belum diverifikasi manusia",
        )
        sentiment.batch_predict.assert_not_called()
        category.batch_predict.assert_not_called()


if __name__ == "__main__":
    unittest.main()
