import {Abi} from 'abitype';
import type {Artifact, DeploymentConstruction, Deployment, Environment, PendingDeployment} from 'rocketh';
import {extendEnvironment} from 'rocketh';
import {Chain, createPublicClient, createWalletClient, custom, getAccount} from 'viem';
import {DeployContractParameters, deployContract} from 'viem/contract';

declare module 'rocketh' {
	interface Environment {
		deploy: DeployFunction;
	}
}

export type DeployFunction = <TAbi extends Abi, TChain extends Chain = Chain>(
	name: string,
	args: DeploymentConstruction<TAbi, TChain>
) => Promise<Deployment<TAbi>>;

export type DeployOptions =
	| {
			skipIfAlreadyDeployed?: boolean;
	  }
	| {
			alwaysOverride?: boolean;
	  };

extendEnvironment((env: Environment) => {
	const transport = custom(env.network.provider);
	const viemClient = createPublicClient({transport});
	const walletClient = createWalletClient({transport});

	async function deploy<TAbi extends Abi, TChain extends Chain = Chain>(
		name: string,
		args: DeploymentConstruction<TAbi>,
		options?: DeployOptions
	) {
		const {account, artifact, ...viemArgs} = args;
		let address: `0x${string}`;
		if (account.startsWith('0x')) {
			address = account as `0x${string}`;
		} else {
			if (env.accounts) {
				address = env.accounts[account];
				if (!address) {
					throw new Error(`no address for ${account}`);
				}
			} else {
				throw new Error(`no accounts setup, cannot get address for ${account}`);
			}
		}
		const viemAccount = getAccount(address);

		const partialDeployment = (typeof artifact === 'string' ? env.artifacts[artifact] : artifact) as Artifact<TAbi>;

		const bytecode = partialDeployment.bytecode;
		const abi = partialDeployment.abi;

		const argsToUse: DeployContractParameters<TChain, TAbi> = {
			...viemArgs,
			account: viemAccount,
			abi,
			bytecode,
		} as unknown as DeployContractParameters<TChain, TAbi>; // TODO why casting necessary here

		const txHash = await deployContract<TChain, TAbi>(walletClient, argsToUse);
		const pendingDeployment: PendingDeployment<TAbi> = {...args, partialDeployment, txHash};
		return env.saveWhilePending(name, pendingDeployment);
	}

	env.deploy = deploy;
	return env;
});
