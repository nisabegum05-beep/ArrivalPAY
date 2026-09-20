import { publicEnvironment } from "./env";

export const network = Object.freeze({
  ...publicEnvironment,
  label: "Stellar Testnet",
  passphrase: "Test SDF Network ; September 2015",
  friendbotUrl: "https://friendbot.stellar.org",
  assetCode: "USDC",
  assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  // Deterministic Stellar Asset Contract address for the classic USDC asset
  // above on Testnet (Asset.contractId(Networks.TESTNET)), confirmed live
  // (symbol "USDC", 7 decimals) — this is the `token` an intent is created
  // with, not a separately deployed/trusted value.
  assetContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  // Expected values from the development specification. SEP-1 verifies them
  // live before authentication (see src/services/anchor/discovery.ts).
  anchorSigningKey: "GDXYO6FJCNXZEWGXD54GT76FGFYLOLSOGSOJLNQ6WGHCGEQPO7NTE73M",
  anchorHomeDomain: new URL(publicEnvironment.anchorUrl).host,
  explorerUrl: "https://stellar.expert/explorer/testnet",
});
