import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict
import logging
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class SentimentAnalyzer:
    """
    Analisis sentimen menggunakan IndoBERT (Indonesian BERT)
    """

    def __init__(self, model_name: str = "indobenchmark/indobert-base-p1"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None

        # Check GPU configuration
        use_gpu = os.getenv('USE_SENTIMENT_GPU', 'true').lower() == 'true'
        if use_gpu and torch.cuda.is_available():
            self.device = torch.device("cuda")
            logger.info(f"Using GPU for IndoBERT: {torch.cuda.get_device_name(0)}")
        else:
            self.device = torch.device("cpu")
            logger.info("Using CPU for IndoBERT (slower but works without GPU)")

        self.labels = ['Negatif', 'Netral', 'Positif']

    def load_model(self):
        """
        Load model IndoBERT untuk sentiment analysis
        """
        try:
            logger.info(f"Loading model: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                num_labels=3
            )
            self.model.to(self.device)
            self.model.eval()
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            # Fallback to simple rule-based approach
            logger.warning("Using rule-based sentiment analysis as fallback")

    def predict(self, text: str) -> Dict[str, any]:
        """
        Prediksi sentimen untuk satu teks
        """
        if self.model is None:
            return self._rule_based_sentiment(text)

        try:
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
                confidence, predicted = torch.max(predictions, dim=1)

            return {
                "sentiment": self.labels[predicted.item()],
                "confidence": confidence.item(),
                "probabilities": {
                    label: prob.item()
                    for label, prob in zip(self.labels, predictions[0].tolist())
                }
            }
        except Exception as e:
            logger.error(f"Error in prediction: {e}")
            return self._rule_based_sentiment(text)

    def batch_predict(self, texts: List[str]) -> List[Dict[str, any]]:
        """
        Prediksi sentimen untuk batch teks
        """
        results = []
        for text in texts:
            results.append(self.predict(text))
        return results

    def _rule_based_sentiment(self, text: str) -> Dict[str, any]:
        """
        Fallback rule-based sentiment analysis
        """
        positive_words = ['bagus', 'baik', 'puas', 'senang', 'terima kasih', 'membantu', 'lengkap', 'nyaman', 'ramah']
        negative_words = ['buruk', 'jelek', 'kecewa', 'sulit', 'lambat', 'rusak', 'panas', 'sempit', 'terputus']

        text_lower = text.lower()
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)

        if pos_count > neg_count:
            sentiment = "Positif"
            confidence = 0.6 + (pos_count * 0.05)
        elif neg_count > pos_count:
            sentiment = "Negatif"
            confidence = 0.6 + (neg_count * 0.05)
        else:
            sentiment = "Netral"
            confidence = 0.5

        confidence = min(confidence, 0.95)

        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "probabilities": {
                "Positif": 0.33 if sentiment == "Netral" else (0.7 if sentiment == "Positif" else 0.1),
                "Netral": 0.33 if sentiment == "Netral" else 0.2,
                "Negatif": 0.33 if sentiment == "Netral" else (0.1 if sentiment == "Positif" else 0.7)
            }
        }

# Initialize global instance
sentiment_analyzer = SentimentAnalyzer()
