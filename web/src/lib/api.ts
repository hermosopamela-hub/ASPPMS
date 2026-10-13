// Calls to the Express server. JSON in, JSON out; a failed call becomes an ApiError with the server's message.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type SessionListener = (reason: 'ended' | 'password_change_required') => void;
let sessionListener: SessionListener | null = null;

// The auth context listens, so any call that finds the session gone sends the person back to sign-in.
export function onSessionProblem(listener: SessionListener | null) {
  sessionListener = listener;
}

export async function api<T = any>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    // the server requires a JSON body on every state-changing call
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data && data.error) || res.statusText || 'Something went wrong.';
    // the sign-in call itself answers 401 for a wrong password; that is not an ended session
    if (res.status === 401 && url !== '/auth/login') sessionListener?.('ended');
    if (res.status === 403 && message === 'password_change_required') sessionListener?.('password_change_required');
    throw new ApiError(res.status, message);
  }
  return data as T;
}
