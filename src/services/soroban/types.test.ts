import { describe, expect, it } from "vitest";
import {
  hexToId,
  idToHex,
  randomIntentId,
  resolutionFromCode,
  statusFromCode,
} from "./types";

describe("intent id encoding", () => {
  it("round-trips a 32-byte id through hex", () => {
    const id = randomIntentId();
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(idToHex(hexToId(id))).toBe(id);
  });

  it("rejects an id that is not exactly 32 bytes", () => {
    expect(() => hexToId("ab")).toThrow("32 bytes");
    expect(() => hexToId("g".repeat(64))).toThrow("32 bytes");
  });

  it("generates a different id on every call", () => {
    expect(randomIntentId()).not.toBe(randomIntentId());
  });
});

describe("status and resolution decoding", () => {
  it("matches the contract's discriminants exactly", () => {
    expect(statusFromCode(0)).toBe("Created");
    expect(statusFromCode(1)).toBe("Funded");
    expect(statusFromCode(2)).toBe("Released");
    expect(statusFromCode(3)).toBe("Refunded");
    expect(resolutionFromCode(0)).toBe("Pending");
    expect(resolutionFromCode(1)).toBe("Approved");
    expect(resolutionFromCode(2)).toBe("Rejected");
    expect(resolutionFromCode(3)).toBe("Timeout");
  });

  it("never silently treats an unknown code as a known status", () => {
    expect(() => statusFromCode(4)).toThrow();
    expect(() => resolutionFromCode(4)).toThrow();
  });
});
