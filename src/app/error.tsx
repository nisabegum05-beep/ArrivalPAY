"use client";

import { AsyncState } from "@/components/feedback/async-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <AsyncState
      kind="error"
      title="This page couldn’t be loaded."
      action={<Button onClick={reset}>Try again</Button>}
    >
      <p>
        Please try loading the page again. This message does not indicate a
        payment result.
      </p>
    </AsyncState>
  );
}
