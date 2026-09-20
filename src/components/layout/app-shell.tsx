import { Logo } from "@/components/ui/logo";
import Link from "next/link";
import type { ReactNode } from "react";
import { Navigation } from "./navigation";
import { Tag } from "@/components/ui/tag";
import { network } from "@/config/network";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="site-container">
        <header className="site-header">
          <Link href="/" className="wordmark" aria-label="ArrivalPay home">
            <Logo />
          </Link>
          <Navigation />
          <Tag tone="accent">
            <span className="status-dot" aria-hidden="true" /> {network.label}
          </Tag>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div>
            <Link href="/" className="footer-wordmark">
              <Logo />
            </Link>
            <p>A payment for your next chapter.</p>
          </div>
          <p className="footer-disclosure">
            Testnet prototype. No real money or bank transfers.
            <br />
            Wallet payments and conditional deposits on Stellar.
            TRY funding uses a mock bank transfer; settlement is tracked separately.
          </p>
          <a
            href="https://developers.stellar.org"
            target="_blank"
            rel="noreferrer"
            className="footer-link"
          >
            Built on Stellar <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </footer>
      </div>
    </>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">
          <span aria-hidden="true">•</span> {eyebrow}
        </p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
