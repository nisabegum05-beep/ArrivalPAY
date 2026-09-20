export function Logo({ compact = false }: { compact?: boolean }) {
  return <span className="brand-lockup">
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="brand-symbol">
      <path d="M4 34 17 6h6l13 28h-8l-8-19-8 19H4Z" fill="currentColor" />
      <path d="m5 25 31-7m-7-4 7 4-4 7" stroke="var(--color-paper-white, white)" strokeWidth="7" strokeLinejoin="round" />
      <path d="m5 25 31-7m-7-4 7 4-4 7" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    </svg>
    {!compact && <span>arrival<span className="brand-pay">pay</span><span className="brand-period">.</span></span>}
  </span>;
}
