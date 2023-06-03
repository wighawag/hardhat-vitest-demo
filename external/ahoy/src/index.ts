/**
 * This module expose the deploy function which let you deploy smart contract on ethereum compatible networks
 *
 * @module on-board
 */

import {Abi, Narrow} from 'abitype';
import {deployContract, DeployContractParameters} from 'viem/contract';
import {EIP1193Account, EIP1193DATA, EIP1193ProviderWithoutEvents} from 'eip-1193';
import {traverseMultipleDirectory} from './utils/fs';
import path from 'node:path';
import fs from 'node:fs';
import {JSONRPCHTTPProvider} from './lib/eip-1193-json-provider';
import {Chain, createPublicClient, createWalletClient, http, getAccount, custom} from 'viem';

require('esbuild-register/dist/node').register();

type BaseConfig = {
	scripts?: string;
	deployments?: string;

	tags?: string[];
};

type ConfigForJSONRPC = BaseConfig & {
	nodeUrl: string;
};

type ConfigForEIP1193Provider = BaseConfig & {
	provider: EIP1193ProviderWithoutEvents;
};

export type Config = ConfigForJSONRPC | ConfigForEIP1193Provider;

type ResolvedConfig = Config & {deployments: string; scripts: string; tags: string[]};

export type Deployment<TAbi extends Abi> = {
	address: EIP1193Account;
	abi: Narrow<TAbi>;
	txHash: EIP1193DATA;
	// TODO more
};

export type UnknownDeployments = Record<string, Deployment<Abi>>;
export type UnknownArtifacts = {[name: string]: Artifact};
export type UnknownNamedAccounts = {
	[name: string]: EIP1193Account;
};

export type UnknownDeploymentsAcrossNetworks = Record<string, UnknownDeployments>;

export type Context<
	NetworkName extends string,
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	DeploymentsAcrossNetworks extends UnknownDeploymentsAcrossNetworks = UnknownDeploymentsAcrossNetworks
> = {
	deployments?: DeploymentsAcrossNetworks;
	accounts: NamedAccounts;
	artifacts: Artifacts;
	network: NetworkName;
};

export type OnBoardEnvironment<
	NetworkName extends string,
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	DeploymentsAcrossNetworks extends UnknownDeploymentsAcrossNetworks = UnknownDeploymentsAcrossNetworks
> = {
	network: NetworkName;
	config: ResolvedConfig;
	deploy: DeployFunction;
	provider: EIP1193ProviderWithoutEvents;
	deployments: DeploymentsAcrossNetworks;
	accounts: NamedAccounts;
	artifacts: Artifacts;
};

// export type CreateFn<
// 	NetworkName extends string,
// 	Artifacts extends UnknownArtifacts = UnknownArtifacts,
// 	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
// 	Deployments extends UnknownDeployments = UnknownDeployments
// > = (
// 	context: Context<NetworkName, Artifacts, NamedAccounts, Deployments>
// ) => DeployScriptModule<NetworkName, Artifacts, NamedAccounts, Deployments>;

export type DeployFunctionArgs<TAbi extends Abi, TChain extends Chain = Chain> = Omit<
	DeployContractParameters<TChain, TAbi>,
	'bytecode' | 'account' | 'abi'
> & {account: string | EIP1193Account; artifact: string | Artifact<TAbi>; abi?: TAbi};
export type DeployFunction = <TAbi extends Abi, TChain extends Chain = Chain>(
	name: string,
	args: DeployFunctionArgs<TAbi, TChain>
) => Promise<Deployment<TAbi>>;

export type DeployScriptFunction<
	NetworkName extends string,
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	DeploymentsAcrossNetworks extends UnknownDeploymentsAcrossNetworks = UnknownDeploymentsAcrossNetworks
> = (
	env: OnBoardEnvironment<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>
) => Promise<void | boolean>;

export interface DeployScriptModule<
	NetworkName extends string,
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	DeploymentsAcrossNetworks extends UnknownDeploymentsAcrossNetworks = UnknownDeploymentsAcrossNetworks
> {
	// (): DeployScriptFunction<NetworkName, Artifacts, NamedAccounts, Deployments>;
	(env: OnBoardEnvironment<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>): Promise<void | boolean>;
	context: Context<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>;
	skip?: (
		env: OnBoardEnvironment<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>
	) => Promise<boolean>;
	tags?: string[];
	dependencies?: string[];
	runAtTheEnd?: boolean;
	id?: string;
}

export type Artifact<TAbi extends Abi = Abi> = {
	abi: TAbi;
	bytecode: EIP1193DATA;
};

export type AhoyConfig = {
	fetchArtifact(name: string): Promise<Artifact>;
};

export type ScriptCallback<
	NetworkName extends string,
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	DeploymentsAcrossNetworks extends UnknownDeploymentsAcrossNetworks = UnknownDeploymentsAcrossNetworks
> = (env: OnBoardEnvironment<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>) => Promise<void>;

export function createFn<
	NetworkName extends string,
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	DeploymentsAcrossNetworks extends UnknownDeploymentsAcrossNetworks = UnknownDeploymentsAcrossNetworks
>(
	context: Context<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>,
	callback: DeployScriptFunction<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>,
	options: {tags?: string[]; dependencies?: string[]}
): DeployScriptModule<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks> {
	const scriptModule = (env: OnBoardEnvironment<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>) =>
		callback(env);
	scriptModule.context = context;
	scriptModule.tags = options.tags;
	scriptModule.dependencies = options.dependencies;
	// TODO id + skip
	return scriptModule as unknown as DeployScriptModule<
		NetworkName,
		Artifacts,
		NamedAccounts,
		DeploymentsAcrossNetworks
	>;
}

export async function loadAndExecuteDeployments<
	NetworkName extends string,
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	DeploymentsAcrossNetworks extends UnknownDeploymentsAcrossNetworks = UnknownDeploymentsAcrossNetworks
>(config: Config, context?: Context<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>) {
	const resolvedConfig: ResolvedConfig = {deployments: 'deployments', scripts: 'deploy', tags: [], ...config};

	return executeDeployScripts<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>(resolvedConfig);

	// TODO
	// await this.export(options);
}

export async function executeDeployScripts<
	NetworkName extends string,
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	DeploymentsAcrossNetworks extends UnknownDeploymentsAcrossNetworks = UnknownDeploymentsAcrossNetworks
>(
	config: ResolvedConfig,
	context?: Context<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>
): Promise<DeploymentsAcrossNetworks & {[key in NetworkName]: DeploymentsAcrossNetworks}> {
	let filepaths;
	filepaths = traverseMultipleDirectory([config.scripts]);
	filepaths = filepaths.sort((a: string, b: string) => {
		if (a < b) {
			return -1;
		}
		if (a > b) {
			return 1;
		}
		return 0;
	});

	const scriptModuleByFilePath: {[filename: string]: DeployScriptModule<string>} = {};
	// const scriptFuncByFilePath: {[filename: string]: DeployScriptFunction} = {};
	const scriptPathBags: {[tag: string]: string[]} = {};
	const scriptFilePaths: string[] = [];

	for (const filepath of filepaths) {
		const scriptFilePath = path.resolve(filepath);
		let scriptModule: DeployScriptModule<string>;
		// console.log("fetching " + scriptFilePath);
		try {
			if (require.cache) {
				delete require.cache[scriptFilePath]; // ensure we reload it every time, so changes are taken in consideration
			}
			scriptModule = require(scriptFilePath);

			if ((scriptModule as any).default) {
				scriptModule = (scriptModule as any).default as DeployScriptModule<string>;
				if ((scriptModule as any).default) {
					console.warn(`double default...`);
					scriptModule = (scriptModule as any).default as DeployScriptModule<string>;
				}
			}
			scriptModuleByFilePath[scriptFilePath] = scriptModule;
			if (context && context !== scriptModule.context) {
				throw new Error(`context between 2 scripts is different, please share the same across them`);
			}
			context = scriptModule.context as Context<NetworkName, Artifacts, NamedAccounts, DeploymentsAcrossNetworks>;
			console.log(`context loaded : ${context.network}`);
		} catch (e) {
			// console.error("require failed", e);
			throw new Error('ERROR processing skip func of ' + filepath + ':\n' + ((e as any).stack || e));
		}
		// console.log("get tags if any for " + scriptFilePath);
		let scriptTags = scriptModule.tags;
		if (scriptTags !== undefined) {
			if (typeof scriptTags === 'string') {
				scriptTags = [scriptTags];
			}
			for (const tag of scriptTags) {
				if (tag.indexOf(',') >= 0) {
					throw new Error('Tag cannot contains commas');
				}
				const bag = scriptPathBags[tag] || [];
				scriptPathBags[tag] = bag;
				bag.push(scriptFilePath);
			}
		}
		// console.log("tags found " + scriptFilePath, scriptTags);
		if (config.tags !== undefined && config.tags.length > 0) {
			let found = false;
			if (scriptTags !== undefined) {
				for (const tagToFind of config.tags) {
					for (const tag of scriptTags) {
						if (tag === tagToFind) {
							scriptFilePaths.push(scriptFilePath);
							found = true;
							break;
						}
					}
					if (found) {
						break;
					}
				}
			}
		} else {
			scriptFilePaths.push(scriptFilePath);
		}
	}

	if (!context) {
		throw new Error(`no context loaded`);
	}

	const deployments = context.deployments || ({} as UnknownDeploymentsAcrossNetworks);

	const transport = 'provider' in config ? custom(config.provider) : http(config.nodeUrl);
	const provider = 'provider' in config ? config.provider : new JSONRPCHTTPProvider(config.nodeUrl); // TODO use a viem wrapper ?
	const viemClient = createPublicClient({transport});
	const walletClient = createWalletClient({transport});

	const perliminaryEnvironment = {
		network: context.network,
		provider,
		config,
		deployments,
		accounts: context.accounts,
		artifacts: context.artifacts,
	};

	if (!deployments[context.network]) {
		deployments[context.network] = {} as DeploymentsAcrossNetworks[NetworkName];
	}

	async function save<TAbi extends Abi>(name: string, deployment: Deployment<TAbi>) {
		(deployments[env.network] as UnknownDeployments)[name] = deployment;
	}

	async function deploy<TAbi extends Abi, TChain extends Chain = Chain>(name: string, args: DeployFunctionArgs<TAbi>) {
		const {account, artifact, ...viemArgs} = args;
		const address = account.startsWith('0x') ? (account as `0x${string}`) : perliminaryEnvironment.accounts[account];
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

		const receipt = await viemClient.waitForTransactionReceipt({
			hash: txHash,
		});

		if (!receipt.contractAddress) {
			throw new Error(`failed to deploy contract ${name}`);
		}
		// console.log({contractAddress: receipt.contractAddress, gasUsed: receipt.gasUsed});
		// TODO redefine deployment type, {address, artifact: {abi, bytecode, metadata}, txHash, args...}
		const deployment = {address: receipt.contractAddress, abi: artifactObject.abi as Narrow<TAbi>, txHash};
		await save(name, deployment);
		return deployment;
	}

	const env: OnBoardEnvironment<string> = {
		...perliminaryEnvironment,
		deploy
	};

	// deploy: async <TAbi extends Abi, TChain extends Chain = Chain>(
	// 	name: string,
	// 	args: DeployFunctionArgs<TAbi, TChain>
	// ) => {

	// console.log({ scriptFilePaths });
	const scriptsRegisteredToRun: {[filename: string]: boolean} = {};
	const scriptsToRun: Array<{
		func: DeployScriptModule<string>;
		filePath: string;
	}> = [];
	const scriptsToRunAtTheEnd: Array<{
		func: DeployScriptModule<string>;
		filePath: string;
	}> = [];
	function recurseDependencies(scriptFilePath: string) {
		if (scriptsRegisteredToRun[scriptFilePath]) {
			return;
		}
		const scriptModule = scriptModuleByFilePath[scriptFilePath];
		if (scriptModule.dependencies) {
			for (const dependency of scriptModule.dependencies) {
				const scriptFilePathsToAdd = scriptPathBags[dependency];
				if (scriptFilePathsToAdd) {
					for (const scriptFilenameToAdd of scriptFilePathsToAdd) {
						recurseDependencies(scriptFilenameToAdd);
					}
				}
			}
		}
		if (!scriptsRegisteredToRun[scriptFilePath]) {
			if (scriptModule.runAtTheEnd) {
				scriptsToRunAtTheEnd.push({
					filePath: scriptFilePath,
					func: scriptModule,
				});
			} else {
				scriptsToRun.push({
					filePath: scriptFilePath,
					func: scriptModule,
				});
			}
			scriptsRegisteredToRun[scriptFilePath] = true;
		}
	}
	for (const scriptFilePath of scriptFilePaths) {
		recurseDependencies(scriptFilePath);
	}

	for (const deployScript of scriptsToRun.concat(scriptsToRunAtTheEnd)) {
		const filename = path.basename(deployScript.filePath);
		// if (deployScript.func.id && this.db.migrations[deployScript.func.id]) {
		// 	log(`skipping ${filename} as migrations already executed and complete`);
		// 	continue;
		// }
		let skip = false;
		if (deployScript.func.skip) {
			try {
				skip = await deployScript.func.skip(env);
			} catch (e) {
				// console.error("skip failed", e);
				throw new Error('ERROR processing skip func of ' + deployScript.filePath + ':\n' + ((e as any).stack || e));
			}
		}
		if (!skip) {
			let result;
			try {
				console.log(`Executing...`);
				result = await deployScript.func(env);
			} catch (e) {
				console.error('execution failed', e);

				throw new Error('ERROR processing ' + deployScript.filePath + ':\n' + ((e as any).stack || e));
			}
			if (result && typeof result === 'boolean') {
				// if (!deployScript.func.id) {
				// 	throw new Error(
				// 		`${deployScript.filePath} return true to not be executed again, but does not provide an id. the script function needs to have the field "id" to be set`
				// 	);
				// }
				// this.db.migrations[deployScript.func.id] = Math.floor(Date.now() / 1000);

				const deploymentFolderPath = config.deployments;

				// TODO refactor to extract this whole path and folder existence stuff
				// const toSave = this.db.writeDeploymentsToFiles && this.network.saveDeployments;
				// if (toSave) {
				// 	try {
				// 		fs.mkdirSync(this.deploymentsPath);
				// 	} catch (e) {}
				// 	try {
				// 		fs.mkdirSync(path.join(this.deploymentsPath, deploymentFolderPath));
				// 	} catch (e) {}
				// 	fs.writeFileSync(
				// 		path.join(this.deploymentsPath, deploymentFolderPath, '.migrations.json'),
				// 		JSON.stringify(this.db.migrations, null, '  ')
				// 	);
				// }
			}
		}
	}

	fs.writeFileSync('./context/deployments.ts', `export default ${JSON.stringify(deployments, null, 2)} as const;`);

	return deployments as any;
}
