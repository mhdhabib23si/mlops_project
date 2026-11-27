import unittest

from facial_expression_model import FacialExpressionAnalyzer


class FacialExpressionSelectionTests(unittest.TestCase):
    def test_selects_sad_when_neutral_leads_by_less_than_margin(self):
        emotion, adjusted = FacialExpressionAnalyzer._select_emotion(
            {"neutral": 0.4296, "sad": 0.3431, "angry": 0.1694}
        )

        self.assertEqual(emotion, "sad")
        self.assertTrue(adjusted)

    def test_keeps_neutral_when_sad_score_is_not_close(self):
        emotion, adjusted = FacialExpressionAnalyzer._select_emotion(
            {"neutral": 0.46, "sad": 0.30, "angry": 0.15}
        )

        self.assertEqual(emotion, "neutral")
        self.assertFalse(adjusted)

    def test_keeps_model_prediction_when_sad_is_top(self):
        emotion, adjusted = FacialExpressionAnalyzer._select_emotion(
            {"sad": 0.43, "neutral": 0.34, "angry": 0.15}
        )

        self.assertEqual(emotion, "sad")
        self.assertFalse(adjusted)


if __name__ == "__main__":
    unittest.main()
