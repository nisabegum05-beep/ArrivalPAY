import type { ReactNode } from "react";

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return <span className={`tag tag--${tone}`}>{children}</span>;
}
