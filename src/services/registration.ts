import type { RegistrationFormValues, RegistrationResult } from '@/types/auth';

import { saveToken } from '@/services/token-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function registerOwner(values: RegistrationFormValues): Promise<RegistrationResult> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      pin: values.pin,
    }),
  });

    if (res.ok) {
    const data = await res.json();
    const ownerId = `TH-MA-${String(data.id).padStart(4, '0')}`;
    if (data.access_token) {
      await saveToken(data.access_token, data.full_name, ownerId);
    }
    return {
      status: 'confirmed',
      account: {
        id: String(data.id),
        name: data.full_name,
      },
    };
  }

  if (res.status === 400) {
    const data = await res.json();
    if (data.detail?.includes('already registered')) {
      return { status: 'error', message: 'This email is already registered. Try logging in.' };
    }
  }

  return { status: 'error', message: 'Could not connect to server. Check your connection and try again.' };
}