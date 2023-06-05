import fs from 'node:fs';

import {createPublicClient, custom} from 'viem';
import {Context, Deployment, Environment, PendingDeployment, ResolvedConfig} from './types';
import {JSONRPCHTTPProvider} from 'eip-1193-json-provider';
import {Abi} from 'abitype';
import {InternalEnvironment} from '../internal/types';
import path from 'node:path';
import {JSONToString, stringToJSON} from '../utils/json';
import {loadDeployments} from './deployments';
import {EIP1193DATA, EIP1193TransactionEIP1193DATA} from 'eip-1193';

export type EnvironmentExtenstion = (env: Environment) => Environment;
//we store this globally so this is not lost
(globalThis as any).extensions = [];
export function extendEnvironment(extension: EnvironmentExtenstion): void {
	(globalThis as any).extensions.push(extension);
}

export async function createEnvironment(
	config: ResolvedConfig,
	context: Context
): Promise<{internal: InternalEnvironment; external: Environment}> {
	const provider = 'provider' in config ? config.provider : new JSONRPCHTTPProvider(config.nodeUrl);

	const transport = custom(provider);
	const viemClient = createPublicClient({transport});

	const chainId = (await viemClient.getChainId()).toString();

	const {deployments} = loadDeployments(config.deployments, context.network.name, false, chainId);

	const perliminaryEnvironment = {
		config,
		deployments,
		accounts: context.accounts || {},
		artifacts: context.artifacts,
		network: {
			chainId,
			name: context.network.name,
			tags: context.network.tags,
			provider,
		},
	};

	function ensureDeploymentFolder(): string {
		const folderPath = path.join(config.deployments, context.network.name);
		fs.mkdirSync(folderPath, {recursive: true});
		const chainIdFilepath = path.join(folderPath, '.chainId');
		if (!fs.existsSync(chainIdFilepath)) {
			fs.writeFileSync(chainIdFilepath, chainId);
		}
		return folderPath;
	}

	// const signer = {
	// 	async sendTransaction(
	// 		provider: EIP1193ProviderWithoutEvents,
	// 		account: {
	// 			addresss: EIP1193Account;
	// 			config: unknown;
	// 		},
	// 		transaction: EIP1193TransactionEIP1193DATA
	// 	): Promise<EIP1193DATA> {
	// 		return '0x';
	// 	},
	// };

	// async function sendTransaction(transaction: EIP1193TransactionEIP1193DATA): Promise<EIP1193DATA> {
	// 	return '0x';
	// }

	function get<TAbi extends Abi>(name: string): Deployment<TAbi> | undefined {
		return deployments[name] as Deployment<TAbi> | undefined;
	}

	async function save<TAbi extends Abi>(name: string, deployment: Deployment<TAbi>): Promise<Deployment<TAbi>> {
		deployments[name] = deployment;
		if (context.network.saveDeployments) {
			const folderPath = ensureDeploymentFolder();
			fs.writeFileSync(`${folderPath}/${name}.json`, JSONToString(deployment, 2));
		}
		return deployment;
	}

	async function recoverTransactionsIfAny<TAbi extends Abi = Abi>(): Promise<void> {
		const filepath = path.join(config.deployments, context.network.name, '.pending_transactions.json');
		let existingPendingDeployments: {name: string; transaction: PendingDeployment<TAbi>}[];
		try {
			existingPendingDeployments = stringToJSON(fs.readFileSync(filepath, 'utf-8'));
		} catch {
			existingPendingDeployments = [];
		}
		if (existingPendingDeployments.length > 0) {
			while (existingPendingDeployments.length > 0) {
				const pendingTransaction = existingPendingDeployments.shift();
				if (pendingTransaction) {
					console.log(
						`recovering ${pendingTransaction.name} with transaction ${pendingTransaction.transaction.txHash}`
					);
					await waitForTransactionAndSave(pendingTransaction.name, pendingTransaction.transaction);
					console.log(`transaction ${pendingTransaction.transaction.txHash} complete`);
					fs.writeFileSync(filepath, JSONToString(existingPendingDeployments, 2));
				}
			}
			fs.rmSync(filepath);
		}
	}

	async function saveTransaction<TAbi extends Abi = Abi>(name: string, transaction: PendingDeployment<TAbi>) {
		if (context.network.saveDeployments) {
			const folderPath = ensureDeploymentFolder();
			const filepath = path.join(folderPath, '.pending_transactions.json');
			let existingPendingDeployments: {name: string; transaction: PendingDeployment<TAbi>}[];
			try {
				existingPendingDeployments = stringToJSON(fs.readFileSync(filepath, 'utf-8'));
			} catch {
				existingPendingDeployments = [];
			}
			existingPendingDeployments.push({name, transaction});
			fs.writeFileSync(filepath, JSONToString(existingPendingDeployments, 2));
		}
		return deployments;
	}

	async function deleteTransaction<TAbi extends Abi = Abi>(hash: string) {
		if (context.network.saveDeployments) {
			const filepath = path.join(config.deployments, context.network.name, '.pending_transactions.json');
			let existingPendingDeployments: {name: string; transaction: PendingDeployment<TAbi>}[];
			try {
				existingPendingDeployments = stringToJSON(fs.readFileSync(filepath, 'utf-8'));
			} catch {
				existingPendingDeployments = [];
			}
			existingPendingDeployments = existingPendingDeployments.filter((v) => v.transaction.txHash !== hash);
			if (existingPendingDeployments.length === 0) {
				fs.rmSync(filepath);
			} else {
				fs.writeFileSync(filepath, JSONToString(existingPendingDeployments, 2));
			}
		}
	}

	async function exportDeploymentsAsTypes() {
		const folderPath = './generated';
		fs.mkdirSync(folderPath, {recursive: true});
		fs.writeFileSync(`${folderPath}/deployments.ts`, `export default ${JSONToString(deployments, 2)} as const;`);
	}

	async function waitForTransactionAndSave<TAbi extends Abi = Abi>(
		name: string,
		pendingDeployment: PendingDeployment<TAbi>
	): Promise<Deployment<TAbi>> {
		const receipt = await viemClient.waitForTransactionReceipt({
			hash: pendingDeployment.txHash,
		});

		if (!receipt.contractAddress) {
			throw new Error(`failed to deploy contract ${name}`);
		}
		const {abi, ...artifactObjectWithoutABI} = pendingDeployment.partialDeployment;

		// TODO options
		for (const key of Object.keys(artifactObjectWithoutABI)) {
			if (key.startsWith('_')) {
				delete (artifactObjectWithoutABI as any)[key];
			}
			if (key === 'evm') {
				const {gasEstimates} = artifactObjectWithoutABI.evm;
				artifactObjectWithoutABI.evm = {
					gasEstimates,
				};
			}
		}

		const deployment = {
			address: receipt.contractAddress,
			txHash: pendingDeployment.txHash,
			abi,
			...artifactObjectWithoutABI,
		};
		return save(name, deployment);
	}

	async function saveWhilePending<TAbi extends Abi = Abi>(name: string, pendingDeployment: PendingDeployment<TAbi>) {
		await saveTransaction<TAbi>(name, pendingDeployment);
		const deployment = waitForTransactionAndSave<TAbi>(name, pendingDeployment);
		await deleteTransaction(pendingDeployment.txHash);
		return deployment;
	}

	let env: Environment = {
		...perliminaryEnvironment,
		save,
		saveWhilePending,
		get,
	};
	for (const extension of (globalThis as any).extensions) {
		env = extension(env);
	}

	return {
		external: env,
		internal: {
			exportDeploymentsAsTypes,
			recoverTransactionsIfAny,
		},
	};
}
