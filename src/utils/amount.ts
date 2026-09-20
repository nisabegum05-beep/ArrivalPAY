const STELLAR_MAX = 9_223_372_036_854_775_807n;

/** Exact decimal conversion. No float parsing, exponent syntax, or rounding. */
export function parseAmount(value: string, decimals: 2 | 7 = 7): bigint {
  if (!new RegExp(`^(0|[1-9]\\d{0,18})(\\.\\d{1,${decimals}})?$`).test(value)) {
    throw new Error(`Amount must use at most ${decimals} decimal places.`);
  }
  const [whole = "0", fraction = ""] = value.split(".");
  const result =
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0"));
  if (result > STELLAR_MAX)
    throw new Error("Amount exceeds the Stellar limit.");
  return result;
}

export function formatAmount(units: bigint, decimals: 2 | 7 = 7): string {
  if (units < 0n) throw new Error("Amount cannot be negative.");
  const scale = 10n ** BigInt(decimals);
  return `${units / scale}.${(units % scale).toString().padStart(decimals, "0")}`;
}

export function displayAmount(value: string): string {
  const canonical = formatAmount(parseAmount(value));
  const [whole = "0", fraction = ""] = canonical.split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction.replace(/0+$/, "").padEnd(2, "0")}`;
}
