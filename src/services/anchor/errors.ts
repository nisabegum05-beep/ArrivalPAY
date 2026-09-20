export type AnchorErrorCode =
  | "DISCOVERY_FAILED"
  | "DOMAIN_MISMATCH"
  | "SIGNING_KEY_MISMATCH"
  | "ASSET_MISMATCH"
  | "CHALLENGE_INVALID"
  | "AUTH_REJECTED"
  | "SESSION_EXPIRED"
  | "UNSUPPORTED_ASSET"
  | "QUOTE_EXPIRED"
  | "AMOUNT_OUT_OF_RANGE"
  | "PENDING_TRUST"
  | "INVALID_RESPONSE"
  | "NETWORK";

export class AnchorError extends Error {
  constructor(
    public readonly code: AnchorErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AnchorError";
  }
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/** Anchor SEP endpoints return {"error": "..."} and sometimes a typed {"type": "..."}. */
function anchorMessage(body: unknown): { type?: string; error?: string } {
  const value = object(body);
  return {
    type: typeof value.type === "string" ? value.type : undefined,
    error: typeof value.error === "string" ? value.error : undefined,
  };
}

export function safeAnchorError(status: number, body: unknown): AnchorError {
  const { type, error } = anchorMessage(body);
  if (status === 401 || status === 403 || type === "authentication_required")
    return new AnchorError(
      "SESSION_EXPIRED",
      "Your anchor session expired or is invalid. Authenticate again.",
    );
  if (status === 400 || status === 404)
    return new AnchorError(
      "INVALID_RESPONSE",
      error ?? "The anchor rejected this request.",
    );
  if (status >= 500)
    return new AnchorError(
      "NETWORK",
      "The anchor is temporarily unavailable. Try again shortly.",
    );
  return new AnchorError(
    "INVALID_RESPONSE",
    error ?? "The anchor rejected this request.",
  );
}

export function safeError(error: unknown): AnchorError {
  if (error instanceof AnchorError) return error;
  return new AnchorError(
    "NETWORK",
    "Could not reach the anchor. Check your connection and try again.",
  );
}
