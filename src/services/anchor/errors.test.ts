import { describe, expect, it } from "vitest";
import { safeAnchorError, safeError, AnchorError } from "./errors";

describe("anchor error mapping", () => {
  it("maps 401/403 and the authentication_required type to a re-authenticate prompt", () => {
    expect(safeAnchorError(401, { error: "expired" }).code).toBe(
      "SESSION_EXPIRED",
    );
    expect(
      safeAnchorError(403, {
        type: "authentication_required",
        error: "missing or invalid SEP-10 token",
      }).code,
    ).toBe("SESSION_EXPIRED");
  });
  it("surfaces the anchor's own message for 400/404 without inventing one", () => {
    const error = safeAnchorError(400, { error: "amount below minimum" });
    expect(error.code).toBe("INVALID_RESPONSE");
    expect(error.message).toBe("amount below minimum");
  });
  it("treats 5xx as a temporary anchor outage, not a rejected request", () => {
    expect(safeAnchorError(503, {}).code).toBe("NETWORK");
  });
  it("never throws while reading a non-object body", () => {
    expect(safeAnchorError(400, "not-json").code).toBe("INVALID_RESPONSE");
    expect(safeAnchorError(400, null).code).toBe("INVALID_RESPONSE");
  });
  it("passes AnchorError through safeError and wraps everything else as NETWORK", () => {
    const original = new AnchorError("QUOTE_EXPIRED", "expired");
    expect(safeError(original)).toBe(original);
    expect(safeError(new TypeError("fetch failed")).code).toBe("NETWORK");
  });
});
