import { describe, expect, it } from "vitest";
import { displayAmount, formatAmount, parseAmount } from "./amount";

describe("exact currency amounts", () => {
  it("keeps seven decimal places and amounts beyond Number precision", () => {
    expect(parseAmount("900719925.4740993")).toBe(9007199254740993n);
    expect(formatAmount(9007199254740993n)).toBe("900719925.4740993");
    expect(displayAmount("1234.0000001")).toBe("1,234.0000001");
    expect(parseAmount("50.01", 2)).toBe(5001n);
  });
  it.each([
    "-1",
    "1e3",
    "0.00000001",
    "NaN",
    "1,000",
    " 1",
    "01",
    "1.",
    "922337203685.4775808",
  ])("rejects ambiguous or out-of-range input %s", (value) =>
    expect(() => parseAmount(value)).toThrow(),
  );
  it("does not round extra TRY decimals", () =>
    expect(() => parseAmount("50.001", 2)).toThrow());
});
