import {
  Keypair,
  Networks,
  TransactionBuilder,
  WebAuth,
} from "@stellar/stellar-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { network } from "@/config/network";
import { AnchorError } from "./errors";
import {
  requestChallenge,
  sessionValid,
  submitChallenge,
  verifySignedChallenge,
} from "./auth";
import type { AnchorDiscovery } from "./types";

const serverKey = Keypair.random();
const discovery: AnchorDiscovery = {
  homeDomain: "tr-mock-anchor.fly.dev",
  webAuthEndpoint: "https://tr-mock-anchor.fly.dev/auth",
  transferServer: "https://tr-mock-anchor.fly.dev/sep6",
  kycServer: "https://tr-mock-anchor.fly.dev/sep12",
  quoteServer: "https://tr-mock-anchor.fly.dev/sep38",
  signingKey: serverKey.publicKey(),
  assetIssuer: network.assetIssuer,
};

function challengeXdr(clientAddress: string) {
  return WebAuth.buildChallengeTx(
    serverKey,
    clientAddress,
    discovery.homeDomain,
    300,
    Networks.TESTNET,
    discovery.homeDomain,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SEP-10 challenge safety", () => {
  it("accepts a genuine challenge and rejects one issued for another account", async () => {
    const client = Keypair.random();
    const xdr = challengeXdr(client.publicKey());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ transaction: xdr }), { status: 200 })),
    );
    const result = await requestChallenge(discovery, client.publicKey());
    expect(result.xdr).toBe(xdr);

    const other = Keypair.random();
    await expect(requestChallenge(discovery, other.publicKey())).rejects.toThrow(
      AnchorError,
    );
  });

  it("rejects a challenge signed by the wrong server key before any signature is requested", async () => {
    const client = Keypair.random();
    const impostor = Keypair.random();
    const xdr = WebAuth.buildChallengeTx(
      impostor,
      client.publicKey(),
      discovery.homeDomain,
      300,
      Networks.TESTNET,
      discovery.homeDomain,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ transaction: xdr }), { status: 200 })),
    );
    await expect(requestChallenge(discovery, client.publicKey())).rejects.toThrow(
      AnchorError,
    );
  });

  it("verifies the client's signature and detects tampering or a missing signature", () => {
    const client = Keypair.random();
    const unsignedXdr = challengeXdr(client.publicKey());
    const tx = TransactionBuilder.fromXDR(unsignedXdr, network.passphrase);
    tx.sign(client);
    const signed = verifySignedChallenge(unsignedXdr, tx.toXDR(), client.publicKey());
    expect(signed.signatures.length).toBeGreaterThan(0);

    expect(() =>
      verifySignedChallenge(unsignedXdr, unsignedXdr, client.publicKey()),
    ).toThrow("did not sign");

    const otherClient = Keypair.random();
    const wrongSignerTx = TransactionBuilder.fromXDR(unsignedXdr, network.passphrase);
    wrongSignerTx.sign(otherClient);
    expect(() =>
      verifySignedChallenge(unsignedXdr, wrongSignerTx.toXDR(), client.publicKey()),
    ).toThrow("did not sign");

    const differentChallenge = challengeXdr(client.publicKey());
    const modifiedTx = TransactionBuilder.fromXDR(differentChallenge, network.passphrase);
    modifiedTx.sign(client);
    expect(() =>
      verifySignedChallenge(unsignedXdr, modifiedTx.toXDR(), client.publicKey()),
    ).toThrow("different challenge");
  });

  it("decodes the session JWT and rejects a token issued for another account or already expired", async () => {
    const client = Keypair.random();
    const xdr = challengeXdr(client.publicKey());
    const tx = TransactionBuilder.fromXDR(xdr, network.passphrase);
    tx.sign(client);
    const signed = verifySignedChallenge(xdr, tx.toXDR(), client.publicKey());

    function jwt(sub: string, exp: number) {
      const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify({ sub, exp })).toString("base64url");
      return `${header}.${payload}.sig`;
    }

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ token: jwt(client.publicKey(), Math.floor(Date.now() / 1000) + 600) }),
          { status: 200 },
        ),
      ),
    );
    const session = await submitChallenge(discovery, signed, client.publicKey());
    expect(session.address).toBe(client.publicKey());
    expect(sessionValid(session)).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ token: jwt(Keypair.random().publicKey(), Math.floor(Date.now() / 1000) + 600) }),
          { status: 200 },
        ),
      ),
    );
    await expect(
      submitChallenge(discovery, signed, client.publicKey()),
    ).rejects.toThrow("different account");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ token: jwt(client.publicKey(), Math.floor(Date.now() / 1000) - 10) }),
          { status: 200 },
        ),
      ),
    );
    await expect(
      submitChallenge(discovery, signed, client.publicKey()),
    ).rejects.toThrow("expired");
  });
});
