import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { ButtonLink, Arrow } from "@/components/ui/button";
import { WalletPanel, WalletStatus } from "@/features/wallet/wallet-panel";
import { AnchorConnection, AnchorFundingFlow } from "@/features/anchor/anchor-panel";
import { StudentDeposits } from "@/features/intents/student-deposits";

export const metadata: Metadata = { title: "Student" };

export default function StudentPage() {
  return (
    <>
      <PageHeader
        eyebrow="Student workspace"
        title="Your next chapter, in view."
        description="Your wallet, enrollment deposits, and payment updates—all in one place."
      />
      <div className="workspace-grid">
        <section className="workspace-main" aria-labelledby="deposits-heading">
          <div className="list-heading">
            <h2 id="deposits-heading">Enrollment deposits</h2>
            <WalletStatus />
          </div>
          <StudentDeposits />
          <div className="inline-note">
            <span className="eyebrow">Before you fund</span>
            <p>
              Your institution makes the enrollment decision. The Soroban
              contract applies the payment rules after that decision.
            </p>
            <Link href="/#how-it-works" className="inline-link">
              Understand the payment journey <Arrow />
            </Link>
          </div>
          <AnchorConnection />
          <AnchorFundingFlow />
        </section>
        <WalletPanel />
      </div>
      <section className="workspace-bottom">
        <div>
          <p className="eyebrow">• Keep your records together</p>
          <h2>Every payment has a trail.</h2>
          <p>
            Anchor updates and on-chain transactions will appear in your
            activity.
          </p>
        </div>
        <ButtonLink href="/transactions" variant="secondary">
          View activity <Arrow />
        </ButtonLink>
      </section>
    </>
  );
}
