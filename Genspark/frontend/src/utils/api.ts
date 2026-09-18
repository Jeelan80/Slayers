import type {
  HealthStatus,
  Registration,
  VerificationResult,
  DemoSample,
} from '@/types';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) message = body.detail;
      else if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
  return json<HealthStatus>(res);
}

export async function fetchRegistrations(): Promise<Registration[]> {
  const res = await fetch(`${API_BASE}/api/registrations`, { cache: 'no-store' });
  return json<Registration[]>(res);
}

export async function fetchSamples(): Promise<DemoSample[]> {
  const res = await fetch(`${API_BASE}/api/samples`, { cache: 'no-store' });
  return json<DemoSample[]>(res);
}

export async function submitVerification(form: FormData): Promise<VerificationResult> {
  const res = await fetch(`${API_BASE}/api/verify`, {
    method: 'POST',
    body: form,
  });
  return json<VerificationResult>(res);
}

export async function reviewRegistration(
  id: number,
  action: 'APPROVE' | 'REJECT',
  note?: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/registrations/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reviewer_note: note ?? '' }),
  });
  return json(res);
}

export async function resetDemo(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
  return json(res);
}
