import fs from 'node:fs';

import {Chain, createPublicClient, createWalletClient, custom, getAccount, http} from 'viem';
import {
	Artifact,
	Context,
	DeployFunctionArgs,
	Deployment,
	Environment,
	PendingDeploymentTransaction,
	UnknownDeployments,
} from './types';
import {JSONRPCHTTPProvider} from '../lib/eip-1193-json-provider';
import {Abi} from 'abitype';
import {DeployContractParameters, deployContract} from 'viem/contract';
import {InternalEnvironment, ResolvedConfig} from '../internal/types';
import path from 'node:path';

export function createEnvironment(
	config: ResolvedConfig,
	context: Context
): {internal: InternalEnvironment; external: Environment} {
	const deployments: UnknownDeployments = {};

	const transport = 'provider' in config ? custom(config.provider) : http(config.nodeUrl);
	const provider = 'provider' in config ? config.provider : new JSONRPCHTTPProvider(config.nodeUrl); // TODO use a viem wrapper ?
	const viemClient = createPublicClient({transport});
	const walletClient = createWalletClient({transport});

	const perliminaryEnvironment = {
		config,
		deployments,
		accounts: context.accounts || {},
		artifacts: context.artifacts,
		network: {
			name: context.network.name,
			tags: context.network.tags,
			provider,
		},
	};

	async function save<TAbi extends Abi>(name: string, deployment: Deployment<TAbi>): Promise<UnknownDeployments> {
		deployments[name] = deployment;
		if (context.network.saveDeployments) {
			const folderPath = path.join(config.deployments, context.network.name);
			fs.mkdirSync(folderPath, {recursive: true});
			fs.writeFileSync(`${folderPath}/${name}.json`, JSON.stringify(deployments, null, 2));
		}
		return deployments;
	}

	async function recoverTransactionsIfAny<TAbi extends Abi = Abi>(): Promise<void> {
		const filepath = path.join(config.deployments, context.network.name, '.pending_transactions.json');
		let existingTransactions: {name: string; transaction: PendingDeploymentTransaction<TAbi>}[];
		try {
			existingTransactions = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
		} catch {
			existingTransactions = [];
		}
		while (existingTransactions.length > 0) {
			const pendingTransaction = existingTransactions.shift();
			if (pendingTransaction) {
				console.log(`recovering ${pendingTransaction.name} with transaction ${pendingTransaction.transaction.hash}`);
				await waitForTransactionAndSave(pendingTransaction.name, pendingTransaction.transaction);
				console.log(`transaction ${pendingTransaction.transaction.hash} complete`);
				fs.writeFileSync(filepath, JSON.stringify(existingTransactions, null, 2));
			}
		}
	}

	async function saveTransaction<TAbi extends Abi = Abi>(
		name: string,
		transaction: PendingDeploymentTransaction<TAbi>
	) {
		if (context.network.saveDeployments) {
			const filepath = path.join(config.deployments, context.network.name, '.pending_transactions.json');
			fs.mkdirSync(filepath, {recursive: true});
			let existingTransactions: {name: string; transaction: PendingDeploymentTransaction<TAbi>}[];
			try {
				existingTransactions = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
			} catch {
				existingTransactions = [];
			}
			existingTransactions.push({name, transaction});
			fs.writeFileSync(filepath, JSON.stringify(existingTransactions, null, 2));
		}
		return deployments;
	}

	async function exportDeploymentsAsTypes() {
		const folderPath = './generated';
		fs.mkdirSync(folderPath, {recursive: true});
		fs.writeFileSync(
			`${folderPath}/deployments.ts`,
			`export default ${JSON.stringify(deployments, null, 2)} as const;`
		);
	}

	async function waitForTransactionAndSave<TAbi extends Abi = Abi>(
		name: string,
		pendingTransaction: PendingDeploymentTransaction<TAbi>
	): Promise<Deployment<TAbi>> {
		const receipt = await viemClient.waitForTransactionReceipt({
			hash: pendingTransaction.hash,
		});

		if (!receipt.contractAddress) {
			throw new Error(`failed to deploy contract ${name}`);
		}
		const deployment = {
			...pendingTransaction.artifactObject,
			address: receipt.contractAddress,
			txHash: pendingTransaction.hash,
		};
		await save(name, deployment);
		return deployment;
	}

	async function deploy<TAbi extends Abi, TChain extends Chain = Chain>(name: string, args: DeployFunctionArgs<TAbi>) {
		const {account, artifact, ...viemArgs} = args;
		let address: `0x${string}`;
		if (account.startsWith('0x')) {
			address = account as `0x${string}`;
		} else {
			if (perliminaryEnvironment.accounts) {
				address = perliminaryEnvironment.accounts[account];
				if (!address) {
					throw new Error(`no address for ${account}`);
				}
			} else {
				throw new Error(`no accounts setup, cannot get address for ${account}`);
			}
		}
		const viemAccount = getAccount(address);

		const artifactObject = (
			typeof artifact === 'string' ? perliminaryEnvironment.artifacts[artifact] : artifact
		) as Artifact<TAbi>;

		const bytecode = artifactObject.bytecode;
		const abi = artifactObject.abi;

		const argsToUse: DeployContractParameters<TChain, TAbi> = {
			...viemArgs,
			account: viemAccount,
			abi,
			bytecode,
		} as unknown as DeployContractParameters<TChain, TAbi>; // TODO why casting necessary here

		const txHash = await deployContract<TChain, TAbi>(walletClient, argsToUse);
		const pendingTransaction: PendingDeploymentTransaction<TAbi> = {...args, artifactObject, hash: txHash};
		await saveTransaction<TAbi>(name, pendingTransaction);

		return waitForTransactionAndSave<TAbi>(name, pendingTransaction);
	}

	const env: Environment = {
		...perliminaryEnvironment,
		deploy,
		save,
	};
	return {
		external: env,
		internal: {
			exportDeploymentsAsTypes,
			recoverTransactionsIfAny,
		},
	};
}
