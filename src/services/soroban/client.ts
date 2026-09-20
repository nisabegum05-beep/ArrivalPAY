import { Contract, rpc } from "@stellar/stellar-sdk";
import { network } from "@/config/network";

export const sorobanServer = new rpc.Server(network.rpcUrl, {
  allowHttp: false,
});

export const intentContract = new Contract(network.contractId);
