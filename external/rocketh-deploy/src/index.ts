import {Abi} from 'abitype';
import type {
	Artifact,
	DeploymentConstruction,
	Deployment,
	Environment,
	PendingDeployment,
	PartialDeployment,
} from 'rocketh';
import {extendEnvironment} from 'rocketh';
import {Account, Chain, CustomTransport, createPublicClient, createWalletClient, custom} from 'viem';
import {DeployContractParameters, deployContract, encodeDeployData} from 'viem/contract';

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
	const walletClient = createWalletClient<CustomTransport, Chain>({
		transport,
		chain: {
			id: parseInt(env.network.chainId),
			network: env.network.name,
			name: env.network.name,
		} as Chain,
	}); // TODO type

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

		// TODO throw specific error if artifact not found
		const artifactToUse = (typeof artifact === 'string' ? env.artifacts[artifact] : artifact) as Artifact<TAbi>;

		const bytecode = artifactToUse.bytecode;
		const abi = artifactToUse.abi;

		const argsToUse: DeployContractParameters<TAbi, TChain> = {
			...viemArgs,
			account,
			abi,
			bytecode,
		} as unknown as DeployContractParameters<TAbi, TChain>; // TODO why casting necessary here

		const calldata = encodeDeployData(argsToUse);
		const argsData = `0x${calldata.replace(bytecode, '')}` as `0x${string}`;
		const txHash = await deployContract<TAbi, TChain, Account, undefined>(walletClient as any, argsToUse); // TODO type

		const partialDeployment: PartialDeployment<TAbi> = {
			...artifactToUse,
			argsData,
		};
		const pendingDeployment: PendingDeployment<TAbi> = {...args, partialDeployment, txHash};
		return env.saveWhilePending(name, pendingDeployment);
	}

	env.deploy = deploy;
	return env;
});
