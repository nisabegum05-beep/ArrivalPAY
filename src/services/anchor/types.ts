export type AnchorDiscovery = {
  homeDomain: string;
  webAuthEndpoint: string;
  transferServer: string;
  kycServer: string;
  quoteServer: string;
  signingKey: string;
  assetIssuer: string;
};

export type AnchorSession = {
  token: string;
  address: string;
  /** Milliseconds since epoch, decoded from the JWT `exp` claim. */
  expiresAt: number;
};

export type AnchorTransferInfo = {
  depositEnabled: boolean;
  authenticationRequired: boolean;
  feePercent: number;
  fundingMethods: string[];
  claimableBalances: boolean;
};

export type AnchorQuote = {
  id: string;
  sellAsset: string;
  buyAsset: string;
  sellAmount: string;
  buyAmount: string;
  price: string;
  feeAmount: string;
  feeAsset: string;
  /** Milliseconds since epoch. */
  expiresAt: number;
};

export type DepositInstructions = {
  id: string;
  how: string;
  bankName?: string;
  ibanOrAccount?: string;
  transferMemo?: string;
  etaMinutes?: number;
  feePercent?: number;
};

export type AnchorTransactionStatus =
  | "incomplete"
  | "pending_user_transfer_start"
  | "pending_anchor"
  | "pending_trust"
  | "pending_external"
  | "completed"
  | "refunded"
  | "expired"
  | "error";

export type AnchorTransaction = {
  id: string;
  status: AnchorTransactionStatus;
  amountIn?: string;
  amountOut?: string;
  stellarTransactionId?: string;
  moreInfoUrl?: string;
  message?: string;
};
