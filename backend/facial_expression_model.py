import io
import logging
import os
import threading
from typing import Dict

import cv2
import numpy as np
import torch
from PIL import Image, UnidentifiedImageError
from transformers import AutoImageProcessor, AutoModelForImageClassification

logger = logging.getLogger(__name__)


class FacialExpressionAnalyzer:
    def __init__(self, model_name: str = "trpakov/vit-face-expression"):
        self.model_name = os.getenv("FACIAL_EXPRESSION_MODEL", model_name)
        self.processor = None
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._lock = threading.Lock()
        self._face_detector = cv2.CascadeClassifier(
            os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
        )
        if self._face_detector.empty():
            raise RuntimeError("Model deteksi wajah OpenCV tidak dapat dimuat.")

    def _load_model(self) -> None:
        if self.model is not None:
            return

        logger.info("Loading facial expression model: %s", self.model_name)
        self.processor = AutoImageProcessor.from_pretrained(self.model_name)
        self.model = AutoModelForImageClassification.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()
        logger.info("Facial expression model loaded")

    def predict(self, image_bytes: bytes) -> Dict[str, object]:
        with self._lock:
            image = self._decode_image(image_bytes)
            face = self._extract_face(image)
            self._load_model()

            inputs = self.processor(images=face, return_tensors="pt").to(self.device)
            with torch.inference_mode():
                logits = self.model(**inputs).logits
                probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]

            score, class_index = torch.max(probabilities, dim=-1)
            emotion = self.model.config.id2label[class_index.item()].strip().lower()
            sentiment = self._map_sentiment(emotion)
            return {
                "emotion": emotion,
                "sentiment": sentiment,
                "confidence": round(score.item(), 4),
            }

    @staticmethod
    def _decode_image(image_bytes: bytes) -> Image.Image:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("Format foto tidak didukung. Gunakan JPEG, PNG, atau WEBP.")
            if image.width > 4096 or image.height > 4096:
                raise ValueError("Ukuran foto terlalu besar. Batas maksimum 4096 x 4096 piksel.")
            image.load()
            return image.convert("RGB")
        except UnidentifiedImageError as exc:
            raise ValueError("File yang dikirim bukan gambar yang valid.") from exc
        except OSError as exc:
            raise ValueError("Foto tidak dapat dibaca. Coba ambil foto lagi.") from exc

    def _extract_face(self, image: Image.Image) -> Image.Image:
        image_array = np.asarray(image)
        grayscale = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        faces = self._face_detector.detectMultiScale(
            grayscale,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(80, 80),
        )
        if len(faces) == 0:
            raise ValueError("Wajah tidak terdeteksi. Posisikan wajah di tengah dengan pencahayaan cukup.")

        x, y, width, height = max(faces, key=lambda face: face[2] * face[3])
        padding_x = int(width * 0.2)
        padding_y = int(height * 0.2)
        left = max(0, x - padding_x)
        top = max(0, y - padding_y)
        right = min(image.width, x + width + padding_x)
        bottom = min(image.height, y + height + padding_y)
        return image.crop((left, top, right, bottom))

    @staticmethod
    def _map_sentiment(emotion: str) -> str:
        if emotion == "happy":
            return "Positif"
        if emotion in {"neutral", "surprise"}:
            return "Netral"
        if emotion in {"sad", "angry", "disgust", "fear"}:
            return "Negatif"
        raise RuntimeError(f"Label ekspresi dari model tidak dikenal: {emotion}")


facial_expression_analyzer = FacialExpressionAnalyzer()
