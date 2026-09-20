type PublicEnvironment = {
  NEXT_PUBLIC_STELLAR_NETWORK?: string;
  NEXT_PUBLIC_ANCHOR_URL?: string;
  NEXT_PUBLIC_HORIZON_URL?: string;
  NEXT_PUBLIC_STELLAR_RPC_URL?: string;
  NEXT_PUBLIC_INTENT_CONTRACT_ID?: string;
};

// The MVP intentionally accepts only its known Testnet services. Endpoint
// overrides must not silently send wallet authentication to another origin.
const defaults = {
  anchorUrl: "https://tr-mock-anchor.fly.dev",
  horizonUrl: "https://horizon-testnet.stellar.org",
  rpcUrl: "https://soroban-testnet.stellar.org",
  // The deployed Conditional Payment Intent contract (phase 5). See
  // docs/CONTRACT.md for the deployment evidence.
  contractId: "CDL4LVIFDJGLZCYJ7W2644NSYKPGMC6K5XPEPYHRTXPWZ2LNWBCD7NNK",
} as const;

function knownEndpoint(
  value: string | undefined,
  expected: string,
  key: string,
) {
  if (!value?.trim()) return expected;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
  if (url.href !== `${expected}/`) {
    throw new Error(`${key} must use the supported Testnet endpoint.`);
  }
  return expected;
}

export function parsePublicEnvironment(environment: PublicEnvironment) {
  const network = environment.NEXT_PUBLIC_STELLAR_NETWORK?.trim() || "testnet";
  if (network !== "testnet") {
    throw new Error("ArrivalPay currently supports Stellar Testnet only.");
  }

  const contractId =
    environment.NEXT_PUBLIC_INTENT_CONTRACT_ID?.trim() || defaults.contractId;
  // Syntax guard only. An override does not have to match the deployed
  // contract above — e.g. pointing at a redeployed instance during
  // development — but it must still look like a real contract address.
  if (!/^C[A-Z2-7]{55}$/.test(contractId)) {
    throw new Error(
      "NEXT_PUBLIC_INTENT_CONTRACT_ID must have Stellar contract address syntax.",
    );
  }

  return Object.freeze({
    network: "testnet" as const,
    anchorUrl: knownEndpoint(
      environment.NEXT_PUBLIC_ANCHOR_URL,
      defaults.anchorUrl,
      "NEXT_PUBLIC_ANCHOR_URL",
    ),
    horizonUrl: knownEndpoint(
      environment.NEXT_PUBLIC_HORIZON_URL,
      defaults.horizonUrl,
      "NEXT_PUBLIC_HORIZON_URL",
    ),
    rpcUrl: knownEndpoint(
      environment.NEXT_PUBLIC_STELLAR_RPC_URL,
      defaults.rpcUrl,
      "NEXT_PUBLIC_STELLAR_RPC_URL",
    ),
    contractId,
  });
}

// Explicit accesses let Next.js replace only these public values in the browser.
export const publicEnvironment = parsePublicEnvironment({
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  NEXT_PUBLIC_ANCHOR_URL: process.env.NEXT_PUBLIC_ANCHOR_URL,
  NEXT_PUBLIC_HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL,
  NEXT_PUBLIC_STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
  NEXT_PUBLIC_INTENT_CONTRACT_ID: process.env.NEXT_PUBLIC_INTENT_CONTRACT_ID,
});
