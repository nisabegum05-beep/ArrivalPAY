import { AsyncState } from "@/components/feedback/async-state";
import { ButtonLink, Arrow } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="eyebrow">• 404 / Page not found</p>
      <h1>A different direction.</h1>
      <AsyncState
        title="This page isn’t here."
        action={
          <ButtonLink href="/">
            Back to overview <Arrow />
          </ButtonLink>
        }
      >
        <p>Check the address, or return to ArrivalPay to find your way.</p>
      </AsyncState>
    </section>
  );
}
