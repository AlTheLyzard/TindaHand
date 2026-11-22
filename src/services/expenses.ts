import { apiFetch } from '@/services/api';

export interface Expense {
  id: number;
  name: string;
  category: string;
  amountCentavos: number;
  expenseDate: string;
  details: string;
  occurredAt: string;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;   // 0.0–1.0
  method: string;       // 'naive_bayes' | 'fuzzy_override' | 'fuzzy' | 'default'
}

/** List all expenses. */
export async function getExpenses(): Promise<Expense[]> {
  return apiFetch<Expense[]>('/expenses');
}

/** Create an expense record. */
export async function createExpense(data: {
  name: string;
  category: string;
  amountCentavos: number;
  expenseDate: string;
  details?: string;
}): Promise<Expense> {
  return apiFetch<Expense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Delete an expense. */
export async function deleteExpense(id: number): Promise<void> {
  return apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' });
}

/**
 * Suggest a category for an expense description using TF-IDF + Naive Bayes + Levenshtein.
 * Accepts informal Tagalog/Taglish phrases and returns the best-match category with a
 * confidence score (0–1) and the classification method used.
 *
 * Only call when MOCK_AUTH_ENABLED is false (confirmed/real session).
 */
export async function suggestExpenseCategory(description: string): Promise<CategorySuggestion> {
  return apiFetch<CategorySuggestion>('/classify/expense', {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
}
