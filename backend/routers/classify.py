"""
Expense classification router.

POST /classify/expense   — classify a Tagalog/Taglish description
"""

from fastapi import APIRouter
from pydantic import BaseModel
from classifier import classify_expense

router = APIRouter(prefix="/classify", tags=["classify"])


class ClassifyRequest(BaseModel):
    description: str


class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    method: str


@router.post("/expense", response_model=ClassifyResponse)
def classify_expense_endpoint(body: ClassifyRequest):
    """
    Classify a Tagalog/Taglish expense description into one of the
    supported expense categories.

    Returns the best-matching category, a confidence score (0–1),
    and the method used (naive_bayes | fuzzy_override | fuzzy | default).
    """
    result = classify_expense(body.description)
    return ClassifyResponse(**result)
