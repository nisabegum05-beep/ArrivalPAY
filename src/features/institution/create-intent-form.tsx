"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { network } from "@/config/network";
import { useWallet } from "@/features/wallet/provider";
import { useIntents } from "@/features/intents/provider";
import { randomIntentId } from "@/services/soroban/types";

const progress: Record<string, string> = {
  creating: "Sign the payment request in Freighter.",
};

function toUnixSeconds(dateValue: string): number | null {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T23:59:59Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor(parsed.getTime() / 1000);
}

export function CreateIntentForm() {
  const { state: wallet } = useWallet();
  const { state: intents, controller } = useIntents();
  const [studentAddress, setStudentAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const busy = !!intents.busy || !!intents.review || intents.receipts.some(r => r.state === "pending");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!wallet.address) {
      setFormError("Connect your institution's wallet first.");
      return;
    }
    const deadlineSeconds = toUnixSeconds(deadline);
    if (!deadlineSeconds) {
      setFormError("Choose a decision deadline.");
      return;
    }
    await controller.createIntent({
      institution: wallet.address,
      id: randomIntentId(),
      student: studentAddress.trim(),
      token: network.assetContractId,
      amount: amount.trim(),
      deadline: deadlineSeconds,
    });
  }

  return (
    <form
      aria-labelledby="request-heading"
      onSubmit={(event) => void onSubmit(event)}
    >
      <fieldset disabled={!wallet.address || busy}>
        <legend className="sr-only">Enrollment deposit request</legend>
        <FormField
          id="student-address"
          name="studentAddress"
          label="Student wallet address"
          placeholder="G…"
          hint="The student who can fund this request."
          autoComplete="off"
          spellCheck={false}
          value={studentAddress}
          onChange={(event) => setStudentAddress(event.target.value)}
          required
        />
        <div className="form-pair">
          <FormField
            id="deposit-amount"
            name="amount"
            label="Amount (USDC)"
            placeholder="0.0000000"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <FormField
            id="deadline"
            name="deadline"
            label="Decision deadline (23:59 UTC)"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            required
          />
        </div>
        <div className="terms-summary">
          <p className="eyebrow">Payment conditions</p>
          <p>Approved → released to your institution.</p>
          <p>Rejected → returned to the student.</p>
          <p>Deadline reached → student can claim a refund.</p>
        </div>
        <Button type="submit" className="full-width" disabled={busy}>
          {busy ? "Requesting signature…" : "Create payment request"}
        </Button>
      </fieldset>
      {!wallet.address && (
        <p className="field-hint">Connect your institution&rsquo;s wallet above.</p>
      )}
      {formError && (
        <p className="field-error" role="alert">
          {formError}
        </p>
      )}
      <div className="wallet-progress" role="status" aria-live="polite">
        {intents.busy ? progress[intents.busy] : ""}
      </div>
      {intents.error && (
        <div className="wallet-notice wallet-notice--error" role="alert">
          <p>{intents.error.message}</p>
        </div>
      )}
      {intents.receipt?.action === "creating" && (
        <div className="wallet-receipt">
          <p>
            {intents.receipt.state === "confirmed"
              ? "Request created."
              : intents.receipt.state === "failed"
                ? "Request not completed."
                : "Result not confirmed yet."}
          </p>
        </div>
      )}
    </form>
  );
}
