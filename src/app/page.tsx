import { Arrow, ButtonLink } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { Tag } from "@/components/ui/tag";

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <p className="eyebrow">
            <span aria-hidden="true">•</span> A new chapter starts here
          </p>
          <h1 id="hero-heading">
            One required payment.
            <br />
            One reusable Stellar wallet.
          </h1>
          <p className="hero-description">
            Your enrollment deposit, with the conditions in plain sight. Fund
            with TRY, hold in USDC, and follow the decision—all from one wallet.
          </p>
          <div className="hero-actions">
            <ButtonLink href="/student">
              Open student demo <Arrow />
            </ButtonLink>
            <ButtonLink href="/institution" variant="text">
              View institution demo <Arrow diagonal />
            </ButtonLink>
          </div>
          <p className="hero-note">
            Built for students going places.
            <br />
            <span>Currently a Testnet prototype. No real funds.</span>
          </p>
        </div>
        <figure className="journey-preview" aria-labelledby="journey-caption">
          <figcaption id="journey-caption" className="preview-caption">
            <span className="eyebrow">The payment journey</span>
            <Tag>Illustration</Tag>
          </figcaption>
          <div className="journey-card journey-card--quote">
            <div className="card-topline">
              <Status tone="ready">Quote ready</Status>
              <span className="step-index">01 / 03</span>
            </div>
            <div className="conversion">
              <span>TRY</span>
              <span className="conversion-arrow" aria-hidden="true">
                →
              </span>
              <span>USDC</span>
            </div>
            <p>A local start. A balance you can take with you.</p>
            <div className="card-bottomline">
              <span>LOCAL CURRENCY</span>
              <span>STELLAR WALLET</span>
            </div>
          </div>
          <div className="journey-card journey-card--funded">
            <div className="card-topline">
              <Status tone="ready">Deposit funded</Status>
              <span className="step-index">02 / 03</span>
            </div>
            <h2>Held for your enrollment.</h2>
            <p>
              The Soroban contract holds your USDC until the payment conditions
              are resolved.
            </p>
            <div className="card-bottomline">
              <span>CONDITIONS FIRST</span>
              <span>USDC ESCROW</span>
            </div>
          </div>
          <div className="journey-card journey-card--pending">
            <div className="card-topline">
              <Status tone="pending">Awaiting institution</Status>
              <span className="step-index">03 / 03</span>
            </div>
            <h2>One decision. A clear outcome.</h2>
            <div className="outcome-row">
              <span>Approved</span>
              <span>
                To the institution <span aria-hidden="true">↗</span>
              </span>
            </div>
            <div className="outcome-row">
              <span>Rejected or timed out</span>
              <span>
                Back to your wallet <span aria-hidden="true">↙</span>
              </span>
            </div>
          </div>
          <p className="preview-disclosure">
            Illustrated states—not a live quote or transaction.
          </p>
        </figure>
      </section>

      <section
        id="how-it-works"
        className="editorial-section"
        aria-labelledby="how-heading"
      >
        <div className="section-intro">
          <p className="eyebrow">• From offer to outcome</p>
          <h2 id="how-heading">
            Know the terms.
            <br />
            Follow the money.
          </h2>
          <p>
            A payment request brings the amount, deadline, and release
            conditions into one place.
          </p>
        </div>
        <ol className="process-list">
          <li>
            <span className="process-number">01</span>
            <div>
              <h3>See what you’re agreeing to.</h3>
              <p>
                Your institution sets the deposit amount and deadline before you
                fund it.
              </p>
            </div>
          </li>
          <li>
            <span className="process-number">02</span>
            <div>
              <h3>Start in TRY. Fund in USDC.</h3>
              <p>
                An anchor converts local currency into a wallet balance. You
                then fund the conditional payment.
              </p>
            </div>
          </li>
          <li>
            <span className="process-number">03</span>
            <div>
              <h3>Track the outcome.</h3>
              <p>
                Approval releases funds to the institution. Rejection returns
                them; after the deadline, you can claim a refund.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="stellar-section" aria-labelledby="stellar-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">• Why Stellar</p>
            <h2 id="stellar-heading">Every part has a purpose.</h2>
          </div>
          <Tag>Built for Testnet</Tag>
        </div>
        <div className="capabilities">
          <article>
            <p className="eyebrow">01 / The way in</p>
            <h3>Anchor</h3>
            <p>
              Connect TRY funding to a USDC balance through standard deposit
              flows.
            </p>
          </article>
          <article>
            <p className="eyebrow">02 / The balance</p>
            <h3>USDC</h3>
            <p>
              Keep a portable wallet balance that can support your next
              cross-border payment.
            </p>
          </article>
          <article>
            <p className="eyebrow">03 / The conditions</p>
            <h3>Soroban</h3>
            <p>
              Apply the institution’s release and refund rules through a
              conditional payment contract.
            </p>
          </article>
        </div>
        <p className="section-footnote">
          Conditional deposits run on Stellar Testnet. TRY funding uses a sandbox Anchor; bank transfers are simulated and USDC settlement depends on the Anchor.
        </p>
      </section>

      <section
        className="extension-section"
        aria-labelledby="extension-heading"
      >
        <div>
          <p className="eyebrow">• Beyond enrollment</p>
          <h2 id="extension-heading">
            First, a deposit.
            <br />
            Then, what comes next.
          </h2>
        </div>
        <div>
          <p>
            One reusable payment structure, with room for more student needs.
          </p>
          <div className="roadmap-tags">
            <Tag>Housing deposits</Tag>
            <Tag>Student grants</Tag>
            <Tag>New payment corridors</Tag>
          </div>
          <p className="section-footnote">
            Roadmap only. Not available in this prototype.
          </p>
        </div>
      </section>
    </>
  );
}
