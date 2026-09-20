import type { ReactNode } from "react";

// Presentation tones, not contract states. Contract state types will come from
// generated bindings when the contract is implemented.
export type StatusTone =
  "neutral" | "ready" | "pending" | "attention" | "error";

export function Status({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span className={`status status--${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
