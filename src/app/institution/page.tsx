import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-shell";
import { WalletConnection } from "@/features/wallet/wallet-panel";
import { InstitutionRequests } from "@/features/institution/institution-requests";
import { CreateIntentForm } from "@/features/institution/create-intent-form";

export const metadata: Metadata = { title: "Institution" };

export default function InstitutionPage() {
  return (
    <>
      <PageHeader
        eyebrow="Institution workspace"
        title="Set the terms. Give clarity."
        description="Create an enrollment payment request, then review the decision when it’s funded."
        action={<WalletConnection />}
      />
      <div className="institution-grid">
        <section aria-labelledby="requests-heading">
          <div className="list-heading">
            <h2 id="requests-heading">Payment requests</h2>
          </div>
          <InstitutionRequests />
          <div className="inline-note">
            <p className="eyebrow">Your role in the payment</p>
            <p>
              Approving a funded request releases the deposit to your
              institution. Rejecting it returns the funds to the student’s
              wallet.
            </p>
          </div>
        </section>
        <section className="request-panel" aria-labelledby="request-heading">
          <div className="card-topline">
            <p className="eyebrow">• Request details</p>
          </div>
          <h2 id="request-heading">
            A clear agreement,
            <br />
            from the start.
          </h2>
          <p className="form-intro">
            The student named below is the only wallet that can fund this
            request.
          </p>
          <CreateIntentForm />
        </section>
      </div>
    </>
  );
}
