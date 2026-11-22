/**
 * useExpenseClassifier
 *
 * Debounced hook that calls the backend TF-IDF + Naive Bayes classifier
 * when the user types an expense description in the "Other details" field.
 *
 * Returns:
 *   - suggestion: the best-match category string (or null if none yet)
 *   - confidence: 0–1 confidence score
 *   - loading: true while a request is in-flight
 *
 * Only fires in confirmed (real) sessions — mock sessions have no backend.
 * Only suggests when confidence >= CONFIDENCE_THRESHOLD (0.55 by default).
 * Automatically cancels stale requests when the description changes.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { suggestExpenseCategory } from '@/services/expenses';
import type { ExpenseCategory } from '@/types/expenses';
import { expenseCategories } from '@/data/quick-add';

/** Minimum confidence score to surface a suggestion to the user. */
const CONFIDENCE_THRESHOLD = 0.55;

/** Wait this many ms after the last keystroke before firing the request. */
const DEBOUNCE_MS = 600;

/** Minimum description length before we bother classifying. */
const MIN_LENGTH = 4;

export interface ClassifierSuggestion {
  category: ExpenseCategory;
  confidence: number;
}

export function useExpenseClassifier(description: string): {
  suggestion: ClassifierSuggestion | null;
  loading: boolean;
} {
  const [suggestion, setSuggestion] = useState<ClassifierSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const latestRequestId = useRef(0);

  const classify = useCallback(async (text: string) => {
    if (MOCK_AUTH_ENABLED) return;
    const trimmed = text.trim();
    if (trimmed.length < MIN_LENGTH) {
      setSuggestion(null);
      setLoading(false);
      return;
    }

    const requestId = ++latestRequestId.current;
    setLoading(true);

    try {
      const result = await suggestExpenseCategory(trimmed);

      // Discard stale responses (description changed while request was in-flight)
      if (requestId !== latestRequestId.current) return;

      // Validate that the returned category is one the app knows about
      const isKnown = (expenseCategories as readonly string[]).includes(result.category);
      if (isKnown && result.confidence >= CONFIDENCE_THRESHOLD) {
        setSuggestion({
          category: result.category as ExpenseCategory,
          confidence: result.confidence,
        });
      } else {
        setSuggestion(null);
      }
    } catch {
      // Network / server errors — silently ignore so the form still works
      if (requestId === latestRequestId.current) setSuggestion(null);
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (MOCK_AUTH_ENABLED) return;
    const timer = setTimeout(() => void classify(description), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [description, classify]);

  return { suggestion, loading };
}
