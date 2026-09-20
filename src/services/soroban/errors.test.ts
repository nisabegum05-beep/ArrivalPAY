import { describe, expect, it } from "vitest";
import {
  contractError,
  parseContractErrorCode,
  safeError,
  safeSimulationError,
  SorobanError,
} from "./errors";

describe("contract error code mapping", () => {
  it("extracts the code from the RPC's raw error text", () => {
    expect(
      parseContractErrorCode(
        "HostError: Error(Contract, #5)\n\nEvent log...",
      ),
    ).toBe(5);
    expect(parseContractErrorCode("no code here")).toBeUndefined();
  });

  it("maps every documented contract error code to a distinct, readable error", () => {
    const codes = [1, 2, 3, 4, 5, 6, 7] as const;
    const seen = new Set<string>();
    for (const code of codes) {
      const error = contractError(code);
      expect(error).toBeInstanceOf(SorobanError);
      expect(error.code).not.toBe("INVALID_RESPONSE");
      seen.add(error.code);
    }
    expect(seen.size).toBe(codes.length);
  });

  it("treats an unrecognized contract error code as an invalid response, not a guess", () => {
    expect(contractError(999).code).toBe("INVALID_RESPONSE");
  });

  it("falls back to a simulation-failed error when no contract code is present", () => {
    expect(safeSimulationError("some unrelated RPC failure").code).toBe(
      "SIMULATION_FAILED",
    );
  });

  it("passes a SorobanError through safeError and wraps anything else as NETWORK", () => {
    const original = new SorobanError("WALLET_REJECTED", "no");
    expect(safeError(original)).toBe(original);
    expect(safeError(new TypeError("boom")).code).toBe("NETWORK");
  });
});
