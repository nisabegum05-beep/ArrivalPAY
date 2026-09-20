import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-shell";
import { AsyncState } from "@/components/feedback/async-state";
import { ButtonLink, Arrow } from "@/components/ui/button";
import { IntentDetail } from "@/features/intents/intent-detail";

export const metadata: Metadata = { title: "Payment request" };

export default async function IntentPage({
  params,
}: {
  params: Promise<{ intentId: string }>;
}) {
  const { intentId } = await params;
  const isValidId = /^[0-9a-f]{64}$/i.test(intentId);
  return (
    <>
      <PageHeader
        eyebrow="Enrollment payment"
        title="The terms come first."
        description="Review the recipient, deposit amount, and release or refund conditions before you pay."
      />
      <div className="reference-line">
        <span className="eyebrow">Requested reference</span>
        <code>{intentId}</code>
      </div>
      {isValidId ? (
        <IntentDetail intentId={intentId.toLowerCase()} />
      ) : (
        <AsyncState
          kind="error"
          title="This reference is not a valid payment request id."
          action={
            <ButtonLink href="/student" variant="secondary">
              Back to student workspace <Arrow />
            </ButtonLink>
          }
        >
          <p>A payment request reference must be 32 bytes (64 hex characters).</p>
        </AsyncState>
      )}
    </>
  );
}
