const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function fetchMe(token: string): Promise<{ id: number; full_name: string; role: string } | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}