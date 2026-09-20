import { Config, Horizon } from "@stellar/stellar-sdk";
import { network } from "@/config/network";

Config.setTimeout(15_000);

export const horizon = new Horizon.Server(network.horizonUrl, {
  allowHttp: false,
});
