import re
import pandas as pd
from typing import List
import logging

logger = logging.getLogger(__name__)

class TextPreprocessor:
    """
    Preprocessing untuk teks bahasa Indonesia
    """

    def __init__(self):
        # Daftar stopwords bahasa Indonesia (basic)
        self.stopwords_id = {
            'yang', 'dan', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan',
            'adalah', 'itu', 'ini', 'sebuah', 'sebagai', 'atau', 'tetapi',
            'karena', 'jika', 'lalu', 'sehingga', 'serta', 'oleh', 'tidak'
        }

    def clean_text(self, text: str) -> str:
        """
        Bersihkan teks dari karakter tidak perlu
        """
        if not isinstance(text, str):
            return ""

        # Lowercase
        text = text.lower()

        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)

        # Remove email
        text = re.sub(r'\S+@\S+', '', text)

        # Remove numbers (optional - comment if needed)
        # text = re.sub(r'\d+', '', text)

        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()

        return text

    def remove_stopwords(self, text: str) -> str:
        """
        Hapus stopwords bahasa Indonesia
        """
        words = text.split()
        filtered = [word for word in words if word not in self.stopwords_id]
        return ' '.join(filtered)

    def preprocess(self, text: str, remove_stop: bool = True) -> str:
        """
        Full preprocessing pipeline
        """
        text = self.clean_text(text)
        if remove_stop:
            text = self.remove_stopwords(text)
        return text

    def batch_preprocess(self, texts: List[str]) -> List[str]:
        """
        Preprocess batch of texts
        """
        return [self.preprocess(text) for text in texts]

def validate_dataframe(df: pd.DataFrame, required_columns: List[str]) -> tuple[bool, str]:
    """
    Validasi DataFrame untuk memastikan struktur yang benar
    """
    # Check if dataframe is empty
    if df.empty:
        return False, "DataFrame kosong"

    # Check required columns
    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        return False, f"Kolom tidak ditemukan: {', '.join(missing_cols)}"

    # Check for null values in required columns
    for col in required_columns:
        null_count = df[col].isnull().sum()
        if null_count > 0:
            logger.warning(f"Kolom '{col}' memiliki {null_count} nilai null")

    return True, "Validation passed"

def clean_dataframe(df: pd.DataFrame, text_column: str = 'Komentar') -> pd.DataFrame:
    """
    Bersihkan DataFrame: remove nulls, duplicates, etc.
    """
    # Remove rows with null in text column
    df = df.dropna(subset=[text_column])

    # Remove duplicates
    df = df.drop_duplicates(subset=[text_column])

    # Remove empty strings
    df = df[df[text_column].str.strip() != '']

    logger.info(f"DataFrame cleaned: {len(df)} rows remaining")
    return df
