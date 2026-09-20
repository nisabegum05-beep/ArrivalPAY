import { AnchorError, safeAnchorError } from "./errors";

/** Every anchor call is bounded; a hung fetch must not freeze the funding flow. */
const TIMEOUT_MS = 20_000;

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new AnchorError(
      "NETWORK",
      "Could not reach the anchor. Check your connection and try again.",
    );
  }
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new AnchorError(
        "INVALID_RESPONSE",
        "The anchor returned an unreadable response.",
      );
    }
  }
  if (!response.ok) throw safeAnchorError(response.status, body);
  return body as T;
}

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  const value = search.toString();
  return value ? `?${value}` : "";
}
