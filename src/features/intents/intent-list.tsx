"use client";

import { AsyncState } from "@/components/feedback/async-state";
import { useIntents } from "./provider";
import { IntentRow } from "./intent-row";

export function IntentList({
  ids,
  viewerAddress,
  emptyTitle,
  emptyBody,
}: {
  ids: string[];
  viewerAddress: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const { state } = useIntents();

  if (state.busy === "listing")
    return (
      <AsyncState kind="loading" title="Loading your requests…">
        <p>Reading the current state from the contract.</p>
      </AsyncState>
    );

  if (state.error && ids.length === 0)
    return (
      <AsyncState kind="error" title="Could not load requests.">
        <p>{state.error.message}</p>
      </AsyncState>
    );

  if (ids.length === 0)
    return (
      <AsyncState title={emptyTitle}>
        <p>{emptyBody}</p>
      </AsyncState>
    );

  return (
    <>
    {state.error && <p role="alert" className="field-error">{state.error.message}</p>}
    <ul className="intent-list">
      {ids.map((id) => {
        const intent = state.intents[id];
        if (!intent) return null;
        return (
          <IntentRow key={id} intent={intent} viewerAddress={viewerAddress} />
        );
      })}
    </ul>
    {ids.length === 50 && <p className="field-hint">Showing the first 50 requests. Open a direct intent link for older entries.</p>}
    </>
  );
}
