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
  suggestedCategory: string;
  confidence: number;   // 0.0–1.0
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
 * Suggest a category for an expense name using TF-IDF + Naive Bayes + Levenshtein.
 * Returns the best-match category and a confidence score.
 */
export async function suggestExpenseCategory(name: string): Promise<CategorySuggestion> {
  return apiFetch<CategorySuggestion>('/expenses/suggest-category', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
