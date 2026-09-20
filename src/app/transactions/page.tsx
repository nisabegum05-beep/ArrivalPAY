import type { Metadata } from "next";
import { WalletStatus } from "@/features/wallet/wallet-panel";
import { PageHeader } from "@/components/layout/app-shell";
import { Activity } from "@/features/transactions/activity";

export const metadata: Metadata = { title: "Activity" };

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Payment activity"
        title="Follow every step."
        description="A shared view of local funding updates and transactions on Stellar."
      />
      <section aria-labelledby="history-heading">
        <div className="list-heading">
          <h2 id="history-heading">Transaction history</h2>
          <WalletStatus />
        </div>
        <Activity />
      </section>
      <div className="source-guide">
        <article>
          <p className="eyebrow">01 / Anchor activity</p>
          <h3>The local funding side.</h3>
          <p>
            Deposit instructions, conversion updates, and your Anchor
            transaction reference.
          </p>
        </article>
        <article>
          <p className="eyebrow">02 / On-chain activity</p>
          <h3>The Stellar record.</h3>
          <p>
            Wallet funding, contract payments, and releases or refunds with
            explorer links.
          </p>
        </article>
      </div>
    </>
  );
}
