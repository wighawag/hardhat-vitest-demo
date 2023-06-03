import { createFn, context } from "../context";

export default createFn(
  context,
  async ({ deploy, accounts, artifacts, deployments }) => {
    const contract = await deploy("Lock", {
      account: accounts.deployer,
      artifact: artifacts.Lock,
      args: [1900000000n],
    });
  },
  { tags: ["Lock", "Lock_deploy"] }
);
