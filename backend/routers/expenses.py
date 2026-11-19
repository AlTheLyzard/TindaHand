"""
Expenses router — record store expenses and auto-categorise them.

TF-IDF + Naive Bayes + Levenshtein lives here:
  POST /expenses/suggest-category takes a free-text expense name and returns the
  most likely category.  It combines three techniques:
    1. TF-IDF  — which words strongly signal each category?
    2. Naive Bayes — multiply the word probabilities to score each category.
    3. Levenshtein distance — fuzzy match against known keywords so typos still work.
"""

import uuid
import math
from difflib import SequenceMatcher
from typing import List, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_role
from models import Expense
from schemas import ExpenseOut, ExpenseCreate, ExpenseCategorySuggestion, OkResponse

router = APIRouter(prefix="/expenses", tags=["expenses"])


# ── TF-IDF + Naive Bayes + Levenshtein  ──────────────────────────────────────

EXPENSE_CATEGORIES = ["Electricity Expense", "Water Expense", "Others Expense"]

# Training corpus — words / phrases associated with each category.
# These seed the classifier; it also learns from the store's own expense records.
CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "Electricity Expense": [
        "electricity", "electric", "kuryente", "meralco", "power", "electric bill",
        "light", "kwh", "watt", "outlet", "plug", "circuit", "bills", "electric company",
        "utility", "energy", "genset", "generator",
    ],
    "Water Expense": [
        "water", "tubig", "maynilad", "manila water", "water bill", "water refill",
        "refill", "mineral water", "purified", "distilled", "water station",
        "gallon", "water supply", "water delivery",
    ],
    "Others Expense": [
        "supplies", "packaging", "bag", "plastic", "receipt", "paper", "pen",
        "cleaning", "soap", "detergent", "bleach", "broom", "mop", "trash",
        "garbage", "rent", "lease", "repair", "maintenance", "transport",
        "delivery", "gasoline", "gas", "food", "meal", "snack", "miscellaneous",
        "misc", "other", "iba", "gastos",
    ],
}

def _levenshtein_similarity(a: str, b: str) -> float:
    """
    Returns 0.0–1.0: how similar two strings are.
    Uses Python's SequenceMatcher which is O(n²) but fine for short strings.
    1.0 = identical, 0.0 = completely different.
    """
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def _tokenize(text: str) -> List[str]:
    """Split text into lowercase words, removing punctuation."""
    import re
    return re.findall(r"[a-z0-9]+", text.lower())

def _keyword_score(word: str, keywords: List[str]) -> float:
    """
    Score how well a word matches a category's keyword list.
    Uses the best Levenshtein similarity across all keywords.
    A similarity ≥ 0.8 counts as a strong match.
    """
    return max((_levenshtein_similarity(word, kw) for kw in keywords), default=0.0)

def suggest_category(name: str, db_expenses: List[Expense]) -> ExpenseCategorySuggestion:
    """
    Three-pass classifier:

    Pass 1 — TF-IDF weighting on training keywords.
      IDF is simulated: common words across all categories get lower weight.

    Pass 2 — Naive Bayes scoring.
      For each category, multiply the per-word match scores.
      (Technically we sum log-probabilities to avoid underflow.)

    Pass 3 — Boost from past DB records.
      If the user already categorised similar expenses, that pattern wins.
    """
    tokens = _tokenize(name)
    if not tokens:
        return ExpenseCategorySuggestion(
            suggested="Others Expense",
            confidence=0.33,
            candidates=EXPENSE_CATEGORIES,
        )

    # Count how many categories each word appears in (for IDF)
    word_category_count: Dict[str, int] = {}
    all_keywords_flat = []
    for kws in CATEGORY_KEYWORDS.values():
        all_keywords_flat.extend(kws)
    for token in tokens:
        in_cats = sum(
            1 for kws in CATEGORY_KEYWORDS.values()
            if any(_levenshtein_similarity(token, kw) >= 0.75 for kw in kws)
        )
        word_category_count[token] = max(in_cats, 1)

    num_categories = len(EXPENSE_CATEGORIES)

    # Naive Bayes: sum log-scores per category
    scores: Dict[str, float] = {}
    for cat, kws in CATEGORY_KEYWORDS.items():
        log_score = 0.0
        for token in tokens:
            match_score = _keyword_score(token, kws)
            # TF-IDF: downweight words that appear in many categories
            idf = math.log(num_categories / word_category_count.get(token, 1) + 1)
            log_score += math.log(match_score * idf + 1e-6)
        scores[cat] = log_score

    # Boost from past DB records (simple frequency boost)
    for expense in db_expenses:
        exp_name = expense.name or ""
        exp_cat  = expense.category or ""
        if exp_cat not in scores:
            continue
        sim = _levenshtein_similarity(name, exp_name)
        if sim >= 0.5:
            scores[exp_cat] += sim * 0.5   # weight past records

    # Rank categories
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    best_cat, best_score = ranked[0]

    # Convert raw log-score to a 0–1 confidence (softmax-style)
    max_s = max(s for _, s in ranked)
    exp_scores = {c: math.exp(s - max_s) for c, s in ranked}
    total_exp  = sum(exp_scores.values())
    confidence = exp_scores[best_cat] / total_exp if total_exp else 0.33

    return ExpenseCategorySuggestion(
        suggested=best_cat,
        confidence=round(confidence, 4),
        candidates=[c for c, _ in ranked],
    )


# ── ENDPOINTS ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ExpenseOut])
def list_expenses(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    expenses = (
        db.query(Expense)
        .filter(Expense.owner_id == owner_id)
        .order_by(Expense.occurred_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        ExpenseOut(
            id=e.id,
            ownerId=f"TH-MA-{e.owner_id:04d}",
            name=e.name,
            category=e.category,
            amountCentavos=e.amount_centavos,
            details=e.details,
            expenseDate=e.expense_date,
            occurredAt=e.occurred_at.isoformat(),
        )
        for e in expenses
    ]


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(
    body: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    occurred_at = None
    try:
        from datetime import datetime
        occurred_at = datetime.fromisoformat(body.occurredAt.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(422, "Invalid occurredAt timestamp")

    expense = Expense(
        id=f"expense-{uuid.uuid4().hex[:10]}",
        owner_id=owner_id,
        name=body.name.strip(),
        category=body.category,
        amount_centavos=body.amountCentavos,
        details=body.details,
        expense_date=body.expenseDate,
        occurred_at=occurred_at,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    return ExpenseOut(
        id=expense.id,
        ownerId=f"TH-MA-{owner_id:04d}",
        name=expense.name,
        category=expense.category,
        amountCentavos=expense.amount_centavos,
        details=expense.details,
        expenseDate=expense.expense_date,
        occurredAt=expense.occurred_at.isoformat(),
    )


@router.post("/suggest-category", response_model=ExpenseCategorySuggestion)
def suggest_expense_category(
    body: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Given a free-text expense name, suggest which category it belongs to.
    Uses TF-IDF + Naive Bayes + Levenshtein fuzzy matching.
    Also learns from the owner's own past expense records.
    """
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(422, "Provide an expense name to categorise")

    owner_id = current_user["db_id"]
    past_expenses = db.query(Expense).filter(
        Expense.owner_id == owner_id,
        Expense.category.isnot(None),
    ).all()

    return suggest_category(name, past_expenses)


@router.delete("/{expense_id}", response_model=OkResponse)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    e = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.owner_id == owner_id,
    ).first()
    if not e:
        raise HTTPException(404, "Expense not found")
    db.delete(e)
    db.commit()
    return OkResponse(message="Expense deleted")
