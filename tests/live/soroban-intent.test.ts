import { mkdir, writeFile } from "node:fs/promises";
import {
  Asset,
  BASE_FEE,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { expect, test } from "vitest";
import { network } from "@/config/network";
import { horizon } from "@/services/stellar/client";
import { sorobanServer } from "@/services/soroban/client";
import {
  getIntent,
  listByInstitution,
  listByStudent,
  prepareApproveIntent,
  prepareCreateIntent,
  prepareFundIntent,
  submitInvocation,
} from "@/services/soroban/intents";
import { randomIntentId } from "@/services/soroban/types";

async function fund(address: string) {
  const response = await fetch(`${network.friendbotUrl}?addr=${address}`, {
    signal: AbortSignal.timeout(45_000),
  });
  expect(response.ok).toBe(true);
}

function signWith(xdr: string, keypair: Keypair): string {
  const tx = TransactionBuilder.fromXDR(xdr, network.passphrase);
  expect(tx).toBeInstanceOf(Transaction);
  (tx as Transaction).sign(keypair);
  return (tx as Transaction).toXDR();
}

/**
 * Live Testnet fixture: exercises this app's own Soroban service code
 * (src/services/soroban/intents.ts) — not the Stellar CLI — against the
 * real, already-deployed Conditional Payment Intent contract. Ephemeral
 * Node-only keypairs stand in for Freighter; a throwaway classic asset
 * (issued fresh by this test) stands in for USDC, purely to exercise the
 * contract's token transfers without depending on the Anchor's own
 * settlement queue (see docs/PHASE_3_4_QA.md for why that is slow/shared).
 */
test(
  "live Testnet fixture drives create -> fund -> approve through this app's own Soroban service code",
  { timeout: 120_000 },
  async () => {
    const issuer = Keypair.random();
    const institution = Keypair.random();
    const student = Keypair.random();
    await Promise.all([
      fund(issuer.publicKey()),
      fund(institution.publicKey()),
      fund(student.publicKey()),
    ]);

    const asset = new Asset("FIXT", issuer.publicKey());
    const amount = "25.0000000";

    // Give both parties a trustline, and the student a balance to fund with.
    for (const [account, needsBalance] of [
      [student, true],
      [institution, false],
    ] as const) {
      const source = await horizon.loadAccount(account.publicKey());
      const builder = new TransactionBuilder(source, {
        fee: "10000",
        networkPassphrase: network.passphrase,
      }).addOperation(Operation.changeTrust({ asset, limit: "1000000" }));
      const tx = builder.setTimeout(60).build();
      tx.sign(account);
      await horizon.submitTransaction(tx);
      if (needsBalance) {
        const issuerAccount = await horizon.loadAccount(issuer.publicKey());
        const payment = new TransactionBuilder(issuerAccount, {
          fee: "10000",
          networkPassphrase: network.passphrase,
        })
          .addOperation(
            Operation.payment({
              destination: student.publicKey(),
              asset,
              amount,
            }),
          )
          .setTimeout(60)
          .build();
        payment.sign(issuer);
        await horizon.submitTransaction(payment);
      }
    }

    // A brand-new classic asset has no Soroban Asset Contract instance until
    // someone deploys it once — permissionless, but required before the
    // conditional-payment-intent contract's token::Client can call it.
    const deployAccount = await sorobanServer.getAccount(issuer.publicKey());
    const deployTx = new TransactionBuilder(deployAccount, {
      fee: BASE_FEE,
      networkPassphrase: network.passphrase,
    })
      .addOperation(Operation.createStellarAssetContract({ asset }))
      .setTimeout(60)
      .build();
    const preparedDeploy = await sorobanServer.prepareTransaction(deployTx);
    preparedDeploy.sign(issuer);
    await sorobanServer.sendTransaction(preparedDeploy);
    const deployHash = Array.from(preparedDeploy.hash(), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    await sorobanServer.pollTransaction(deployHash);

    const tokenContractId = asset.contractId(network.passphrase);
    const id = randomIntentId();
    const deadline = Math.floor(Date.now() / 1000) + 3_600;

    // create_intent (institution)
    const createInvocation = await prepareCreateIntent({
      institution: institution.publicKey(),
      id,
      student: student.publicKey(),
      token: tokenContractId,
      amount,
      deadline,
    });
    const createResult = await submitInvocation(
      createInvocation,
      signWith(createInvocation.xdr, institution),
    );
    expect(createResult.state).toBe("confirmed");

    const created = await getIntent(id, institution.publicKey());
    expect(created?.status).toBe("Created");
    expect(created?.amount).toBe(amount);
    expect(created?.student).toBe(student.publicKey());

    // fund_intent (student)
    const fundInvocation = await prepareFundIntent(id, student.publicKey());
    const fundResult = await submitInvocation(
      fundInvocation,
      signWith(fundInvocation.xdr, student),
    );
    expect(fundResult.state).toBe("confirmed");
    expect((await getIntent(id, student.publicKey()))?.status).toBe("Funded");

    // approve_intent (institution)
    const approveInvocation = await prepareApproveIntent(
      id,
      institution.publicKey(),
    );
    const approveResult = await submitInvocation(
      approveInvocation,
      signWith(approveInvocation.xdr, institution),
    );
    expect(approveResult.state).toBe("confirmed");

    const final = await getIntent(id, institution.publicKey());
    expect(final?.status).toBe("Released");
    expect(final?.resolution).toBe("Approved");

    // Pagination reads: this intent id must appear in both indices.
    const studentIds = await listByStudent(
      student.publicKey(),
      0,
      10,
      student.publicKey(),
    );
    const institutionIds = await listByInstitution(
      institution.publicKey(),
      0,
      10,
      institution.publicKey(),
    );
    expect(studentIds).toContain(id);
    expect(institutionIds).toContain(id);

    await mkdir("docs/evidence", { recursive: true });
    await writeFile(
      "docs/evidence/phase-6-intent.json",
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          kind: "ephemeral Node fixture using this app's own src/services/soroban code; not Freighter or the Stellar CLI",
          contractId: network.contractId,
          intentId: id,
          tokenContractId,
          institution: institution.publicKey(),
          student: student.publicKey(),
          amount,
          createTxHash: createResult.hash,
          fundTxHash: fundResult.hash,
          approveTxHash: approveResult.hash,
          finalStatus: final?.status,
          finalResolution: final?.resolution,
        },
        null,
        2,
      ) + "\n",
    );
  },
);
