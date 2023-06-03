export * from "ahoy";
import artifacts from "./artifacts";
import accounts from "./accounts";
import network from "./currentNetwork";
import deployments from "./deployments";

export const context = {
  artifacts,
  accounts,
  deployments,
  network,
} as const;
