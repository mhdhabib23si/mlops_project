import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict
import logging
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class CategoryClassifier:
    """
    Klasifikasi kategori layanan menggunakan IndoBERT
    Kategori: Kemahasiswaan, Keuangan, Sistem & TI, Perpustakaan, Kerjasama & Karir, BAAK, Sarana & Prasarana
    """

    CATEGORIES = [
        'Kemahasiswaan',
        'Keuangan',
        'Sistem & TI',
        'Perpustakaan',
        'Kerjasama & Karir',
        'BAAK',
        'Sarana & Prasarana'
    ]

    def __init__(self, model_name: str = None):
        # Use IndoBERT for category classification (accessible, no token required)
        self.model_name = model_name or "indobenchmark/indobert-base-p1"
        self.tokenizer = None
        self.model = None

        # Check GPU configuration
        use_gpu = os.getenv('USE_LLM_GPU', 'true').lower() == 'true'
        if use_gpu and torch.cuda.is_available():
            self.device = torch.device("cuda")
            logger.info(f"Using GPU for category classification: {torch.cuda.get_device_name(0)}")
        else:
            self.device = torch.device("cpu")
            logger.info("Using CPU for category classification (slower but works without GPU)")

        # Hugging Face token (optional)
        self.hf_token = os.getenv('HF_TOKEN', '')

    def load_model(self):
        """
        Load model IndoBERT untuk klasifikasi kategori
        """
        try:
            logger.info(f"Loading model: {self.model_name}")

            # Prepare kwargs for tokenizer
            tokenizer_kwargs = {}
            if self.hf_token:
                tokenizer_kwargs['token'] = self.hf_token

            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                **tokenizer_kwargs
            )

            # Prepare kwargs for model
            model_kwargs = {
                'num_labels': len(self.CATEGORIES),
            }

            if self.hf_token:
                model_kwargs['token'] = self.hf_token

            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                **model_kwargs
            )
            self.model.to(self.device)
            self.model.eval()
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            logger.warning("Using rule-based classification as fallback")

    def predict(self, text: str) -> Dict[str, any]:
        """
        Prediksi kategori untuk satu teks
        """
        if self.model is None:
            return self._rule_based_category(text)

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

            predicted_index = predicted.item()
            predicted_category = self.CATEGORIES[predicted_index] if predicted_index < len(self.CATEGORIES) else self.CATEGORIES[0]

            return {
                "category": predicted_category,
                "confidence": confidence.item(),
                "method": "indobert"
            }
        except Exception as e:
            logger.error(f"Error in category prediction: {e}")
            return self._rule_based_category(text)

    def batch_predict(self, texts: List[str]) -> List[Dict[str, any]]:
        """
        Prediksi kategori untuk batch teks
        """
        results = []
        for text in texts:
            results.append(self.predict(text))
        return results



    def _rule_based_category(self, text: str) -> Dict[str, any]:
        """
        Fallback rule-based category classification
        """
        keywords = {
            'Kemahasiswaan': ['mahasiswa', 'ukm', 'organisasi', 'orientasi', 'beasiswa', 'pendampingan'],
            'Keuangan': ['pembayaran', 'ukt', 'cicilan', 'biaya', 'uang', 'cicilan', 'keuangan'],
            'Sistem & TI': ['portal', 'wifi', 'server', 'password', 'login', 'aplikasi', 'sistem', 'ti', 'jaringan'],
            'Perpustakaan': ['buku', 'perpustakaan', 'jurnal', 'ruang baca', 'pustaka', 'referensi'],
            'Kerjasama & Karir': ['kerja', 'magang', 'industri', 'karir', 'bursa', 'lowongan', 'visit'],
            'BAAK': ['surat', 'transkrip', 'akademik', 'administrasi', 'krs', 'cuti', 'baak'],
            'Sarana & Prasarana': ['fasilitas', 'ruang', 'kelas', 'ac', 'kursi', 'bangunan', 'parkir', 'toilet']
        }

        text_lower = text.lower()
        scores = {}

        for category, words in keywords.items():
            score = sum(1 for word in words if word in text_lower)
            scores[category] = score

        predicted = max(scores, key=scores.get) if scores else "Sistem & TI"
        confidence = 0.6 + (scores[predicted] * 0.05) if scores[predicted] > 0 else 0.5
        confidence = min(confidence, 0.85)

        return {
            "category": predicted,
            "confidence": confidence,
            "method": "rule-based"
        }

# Initialize global instance
category_classifier = CategoryClassifier()
