import type { ReactNode } from "react";

type Props = {
  kind?: "empty" | "loading" | "error" | "success";
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export function AsyncState({ kind = "empty", title, children, action }: Props) {
  return (
    <div
      className={`async-state async-state--${kind}`}
      role={
        kind === "error" ? "alert" : kind === "empty" ? undefined : "status"
      }
    >
      <span className="empty-mark" aria-hidden="true">
        {kind === "error"
          ? "!"
          : kind === "success"
            ? "✓"
            : kind === "loading"
              ? "…"
              : "—"}
      </span>
      <h3>{title}</h3>
      <div className="async-description">{children}</div>
      {action && <div className="async-action">{action}</div>}
    </div>
  );
}
