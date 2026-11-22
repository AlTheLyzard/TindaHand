"""
Expense category classifier for TindaHand.

Uses TF-IDF Vectorizer + Multinomial Naive Bayes to map informal
Tagalog/Taglish expense descriptions to accounting categories.
Levenshtein Distance is used as a fuzzy fallback for unrecognized tokens.
"""

from __future__ import annotations
import re
import unicodedata
from typing import Optional

# ---------------------------------------------------------------------------
# Training corpus — Tagalog/Taglish phrases per expense category
# ---------------------------------------------------------------------------
# Categories must match what the mobile app sends in `category` fields.
CATEGORIES = [
    "Electricity Expense",
    "Water Expense",
    "Others Expense",
]

# Each entry is (phrase, category). Phrases are intentionally noisy and
# informal to cover the range of real sari-sari store owner input.
_CORPUS: list[tuple[str, str]] = [
    # ── Electricity ──────────────────────────────────────────────────────────
    ("bayad kuryente", "Electricity Expense"),
    ("bayad sa kuryente", "Electricity Expense"),
    ("kuryente bill", "Electricity Expense"),
    ("meralco", "Electricity Expense"),
    ("meralco bill", "Electricity Expense"),
    ("meralco bayad", "Electricity Expense"),
    ("bayad meralco", "Electricity Expense"),
    ("electricity", "Electricity Expense"),
    ("electric bill", "Electricity Expense"),
    ("electricity bill", "Electricity Expense"),
    ("bayad light", "Electricity Expense"),
    ("light bill", "Electricity Expense"),
    ("kuryente ngayon buwan", "Electricity Expense"),
    ("bill kuryente buwan", "Electricity Expense"),
    ("ilaw bill", "Electricity Expense"),
    ("ilaw at kuryente", "Electricity Expense"),
    ("bayad sa ilaw", "Electricity Expense"),
    ("bayad ilaw", "Electricity Expense"),
    ("kuryente monthly", "Electricity Expense"),
    ("monthly electricity", "Electricity Expense"),
    ("bayad electric", "Electricity Expense"),
    ("kuryente charges", "Electricity Expense"),
    ("kuryente consumption", "Electricity Expense"),
    ("konsumo ng kuryente", "Electricity Expense"),
    ("bayad sa meralco ngayong buwan", "Electricity Expense"),
    ("meralco para sa buwan", "Electricity Expense"),
    ("electricity para sa tindahan", "Electricity Expense"),
    ("bayad bill kuryente tindahan", "Electricity Expense"),
    ("electric charge store", "Electricity Expense"),
    ("kuryente ng tindahan", "Electricity Expense"),

    # ── Water ────────────────────────────────────────────────────────────────
    ("bayad tubig", "Water Expense"),
    ("bayad sa tubig", "Water Expense"),
    ("tubig bill", "Water Expense"),
    ("water bill", "Water Expense"),
    ("maynilad", "Water Expense"),
    ("maynilad bill", "Water Expense"),
    ("bayad maynilad", "Water Expense"),
    ("manila water", "Water Expense"),
    ("bayad manila water", "Water Expense"),
    ("water utilities", "Water Expense"),
    ("water utility", "Water Expense"),
    ("tubig monthly", "Water Expense"),
    ("monthly water", "Water Expense"),
    ("tubig buwan", "Water Expense"),
    ("tubig ngayon buwan", "Water Expense"),
    ("bill tubig buwan", "Water Expense"),
    ("tubig para sa tindahan", "Water Expense"),
    ("bayad sa maynilad ngayong buwan", "Water Expense"),
    ("water consumption", "Water Expense"),
    ("konsumo ng tubig", "Water Expense"),
    ("bayad water", "Water Expense"),
    ("tubig charges", "Water Expense"),
    ("water supply", "Water Expense"),
    ("water service", "Water Expense"),
    ("local water district", "Water Expense"),
    ("bayad sa water district", "Water Expense"),

    # ── Others ───────────────────────────────────────────────────────────────
    # Supplies / Store materials
    ("supplies store", "Others Expense"),
    ("store supplies", "Others Expense"),
    ("plastic bag", "Others Expense"),
    ("plastic bags", "Others Expense"),
    ("carry bags", "Others Expense"),
    ("packaging", "Others Expense"),
    ("plastic packaging", "Others Expense"),
    ("papel de liha", "Others Expense"),
    ("ballpen", "Others Expense"),
    ("notebook", "Others Expense"),
    ("receipt papel", "Others Expense"),
    ("resibo", "Others Expense"),
    ("tissue", "Others Expense"),
    ("rubberband", "Others Expense"),
    ("stapler", "Others Expense"),
    ("scotch tape", "Others Expense"),
    ("masking tape", "Others Expense"),
    ("broom walis", "Others Expense"),
    ("walis tambo", "Others Expense"),
    ("walis tingting", "Others Expense"),
    ("dustpan", "Others Expense"),
    ("mop", "Others Expense"),
    ("labaha", "Others Expense"),
    # Transportation / Freight
    ("pamasahe", "Others Expense"),
    ("pamasahe tricycle", "Others Expense"),
    ("pamasahe jeep", "Others Expense"),
    ("pamasahe bus", "Others Expense"),
    ("pamasahe tricycle puntang talipapa", "Others Expense"),
    ("pamasahe palengke", "Others Expense"),
    ("pamasahe sa palengke", "Others Expense"),
    ("gasoline", "Others Expense"),
    ("gasolina", "Others Expense"),
    ("diesel", "Others Expense"),
    ("gas motor", "Others Expense"),
    ("sasakyan", "Others Expense"),
    ("kotse", "Others Expense"),
    ("tricycle bayad", "Others Expense"),
    ("jeepney", "Others Expense"),
    ("angkot", "Others Expense"),
    ("freight", "Others Expense"),
    ("delivery fee", "Others Expense"),
    ("padala fee", "Others Expense"),
    ("transport", "Others Expense"),
    ("transportation", "Others Expense"),
    ("pasada", "Others Expense"),
    ("fare", "Others Expense"),
    # Cost of Goods / Restocking
    ("pagkain paninda", "Others Expense"),
    ("produkto paninda", "Others Expense"),
    ("resupply", "Others Expense"),
    ("restock", "Others Expense"),
    ("binili products", "Others Expense"),
    ("biniling paninda", "Others Expense"),
    ("binili sa grocery", "Others Expense"),
    ("grocery", "Others Expense"),
    ("palengke", "Others Expense"),
    ("supermarket", "Others Expense"),
    ("binili puhunan", "Others Expense"),
    ("puhunan", "Others Expense"),
    ("capital goods", "Others Expense"),
    ("raw materials", "Others Expense"),
    ("condiments", "Others Expense"),
    ("softdrinks", "Others Expense"),
    ("inumin", "Others Expense"),
    ("biscuits", "Others Expense"),
    ("noodles", "Others Expense"),
    ("canned goods", "Others Expense"),
    ("de lata", "Others Expense"),
    ("bigas", "Others Expense"),
    ("rice", "Others Expense"),
    ("asukal", "Others Expense"),
    ("langis", "Others Expense"),
    ("mantika", "Others Expense"),
    ("sibuyas", "Others Expense"),
    ("bawang", "Others Expense"),
    # Miscellaneous services / others
    ("paupahan", "Others Expense"),
    ("upa", "Others Expense"),
    ("renta", "Others Expense"),
    ("rent", "Others Expense"),
    ("serbisyo", "Others Expense"),
    ("repair", "Others Expense"),
    ("ayos tindahan", "Others Expense"),
    ("pinagawa", "Others Expense"),
    ("hardware", "Others Expense"),
    ("carpenter", "Others Expense"),
    ("tubero", "Others Expense"),
    ("labada", "Others Expense"),
    ("cleaning", "Others Expense"),
    ("insurance", "Others Expense"),
    ("internet", "Others Expense"),
    ("wifi", "Others Expense"),
    ("load", "Others Expense"),
    ("cellphone load", "Others Expense"),
    ("iba pa", "Others Expense"),
    ("miscellaneous", "Others Expense"),
    ("misc", "Others Expense"),
    ("iba ibang gastos", "Others Expense"),
    ("gastos", "Others Expense"),
    ("gastos tindahan", "Others Expense"),
]

# ---------------------------------------------------------------------------
# Text normalisation
# ---------------------------------------------------------------------------
_CONTRACTIONS = {
    "ngayong": "ngayon",
    "puntang": "punta",
    "pag": "para",
}


def _normalize(text: str) -> str:
    """Lowercase, strip accents, collapse whitespace, expand known contractions."""
    text = text.lower().strip()
    # Strip Unicode accents (é → e)
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Keep letters, digits, spaces
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    # Expand contractions
    words = text.split()
    words = [_CONTRACTIONS.get(w, w) for w in words]
    text = " ".join(words)
    return re.sub(r"\s+", " ", text).strip()


# ---------------------------------------------------------------------------
# Levenshtein distance (fuzzy fallback)
# ---------------------------------------------------------------------------
def _levenshtein(a: str, b: str) -> int:
    """Standard Wagner–Fischer DP. O(len(a) * len(b)) — fine for short tokens."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            curr.append(min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (0 if ca == cb else 1)))
        prev = curr
    return prev[-1]


# Keyword → category mapping for the fuzzy layer
_KEYWORDS: list[tuple[str, str]] = [
    ("meralco",        "Electricity Expense"),
    ("kuryente",       "Electricity Expense"),
    ("electricity",    "Electricity Expense"),
    ("electric",       "Electricity Expense"),
    ("ilaw",           "Electricity Expense"),
    ("tubig",          "Water Expense"),
    ("water",          "Water Expense"),
    ("maynilad",       "Water Expense"),
]


def _fuzzy_classify(text: str, threshold: int = 2) -> Optional[str]:
    """
    For each token in `text`, find the closest keyword using Levenshtein.
    If the best distance ≤ threshold, return that keyword's category.
    Returns None when no keyword is close enough.
    """
    tokens = text.split()
    best_dist = threshold + 1
    best_cat: Optional[str] = None
    for token in tokens:
        if len(token) < 3:
            continue
        for keyword, category in _KEYWORDS:
            d = _levenshtein(token, keyword)
            if d < best_dist:
                best_dist = d
                best_cat = category
    return best_cat


# ---------------------------------------------------------------------------
# TF-IDF + Multinomial Naive Bayes model (trained once at import time)
# ---------------------------------------------------------------------------
class _ExpenseClassifier:
    def __init__(self) -> None:
        self._vectorizer = None
        self._model = None
        self._trained = False

    def _train(self) -> None:
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.naive_bayes import MultinomialNB
        except ImportError:
            # scikit-learn not available — classifier degrades gracefully to fuzzy only
            return

        texts = [_normalize(phrase) for phrase, _ in _CORPUS]
        labels = [cat for _, cat in _CORPUS]

        self._vectorizer = TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 3),   # unigrams, bigrams, trigrams
            min_df=1,
            sublinear_tf=True,
        )
        X = self._vectorizer.fit_transform(texts)
        self._model = MultinomialNB(alpha=0.5)
        self._model.fit(X, labels)
        self._trained = True

    def predict(self, raw_text: str) -> dict:
        """
        Returns {"category": str, "confidence": float, "method": str}.
        Always returns a result — falls back through fuzzy → "Others Expense".
        """
        text = _normalize(raw_text)
        if not text:
            return {"category": "Others Expense", "confidence": 0.0, "method": "default"}

        # 1. TF-IDF + Naive Bayes
        if self._trained and self._vectorizer and self._model:
            X = self._vectorizer.transform([text])
            proba = self._model.predict_proba(X)[0]
            idx = int(proba.argmax())
            confidence = float(proba[idx])
            category = self._model.classes_[idx]
            method = "naive_bayes"

            # If NB is very uncertain, let fuzzy have a say
            if confidence < 0.40:
                fuzzy_cat = _fuzzy_classify(text)
                if fuzzy_cat:
                    return {"category": fuzzy_cat, "confidence": round(confidence, 4), "method": "fuzzy_override"}

            return {"category": category, "confidence": round(confidence, 4), "method": method}

        # 2. Fuzzy fallback (no scikit-learn)
        fuzzy_cat = _fuzzy_classify(text)
        if fuzzy_cat:
            return {"category": fuzzy_cat, "confidence": 0.70, "method": "fuzzy"}

        # 3. Default
        return {"category": "Others Expense", "confidence": 0.0, "method": "default"}


# Singleton — trained once when the module is first imported.
_classifier = _ExpenseClassifier()
_classifier._train()


def classify_expense(description: str) -> dict:
    """Public API: classify a raw Tagalog/Taglish expense description."""
    return _classifier.predict(description)
