import {EIP1193Account, EIP1193DATA, EIP1193ProviderWithoutEvents} from 'eip-1193';
import {Abi, Narrow} from 'abitype';
import type {DeployContractParameters} from 'viem/contract';
import type {Chain} from 'viem';
import {ResolvedConfig} from '../internal/types';

export type Deployment<TAbi extends Abi> = {
	address: EIP1193Account;
	abi: Narrow<TAbi>;
	txHash: EIP1193DATA;
	bytecode: EIP1193DATA;
	deployedBytecode: EIP1193DATA;
	linkReferences: any;
	deployedLinkReferences: any;
	devdoc: any; // TODO type
	evm: any; // TODO type
	metadata: string;
	storageLayout: any; // TODO type
	userdoc: any; // TODO type
};

export type Artifact<TAbi extends Abi = Abi> = {
	abi: TAbi;
	bytecode: EIP1193DATA;
	deployedBytecode: EIP1193DATA;
	linkReferences: any;
	deployedLinkReferences: any;
	devdoc: any; // TODO type
	evm: any; // TODO type
	metadata: string;
	storageLayout: any; // TODO type
	userdoc: any; // TODO type
};

export type UnknownDeployments = Record<string, Deployment<Abi>>;
export type UnknownArtifacts = {[name: string]: Artifact};
export type UnknownNamedAccounts = {
	[name: string]: EIP1193Account;
};

export type UnknownDeploymentsAcrossNetworks = Record<string, UnknownDeployments>;

export type Context<
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts
> = {
	network: {
		name: string;
		tags: {[tag: string]: boolean};
		saveDeployments: boolean;
	};
	accounts: NamedAccounts;
	artifacts: Artifacts;
};

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

export type Environment<
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	Deployments extends UnknownDeployments = UnknownDeployments
> = {
	config: ResolvedConfig;
	deploy: DeployFunction;
	network: {
		name: string;
		tags: {[tag: string]: boolean};
		provider: EIP1193ProviderWithoutEvents;
	};
	deployments: Deployments;
	accounts: NamedAccounts;
	artifacts: Artifacts;
	save<TAbi extends Abi = Abi>(name: string, deployment: Deployment<TAbi>): void;
};

export type DeployFunctionArgs<TAbi extends Abi, TChain extends Chain = Chain> = Omit<
	DeployContractParameters<TChain, TAbi>,
	'bytecode' | 'account' | 'abi'
> & {account: string | EIP1193Account; artifact: string | Artifact<TAbi>; abi?: TAbi};
export type DeployFunction = <TAbi extends Abi, TChain extends Chain = Chain>(
	name: string,
	args: DeployFunctionArgs<TAbi, TChain>
) => Promise<Deployment<TAbi>>;

export type PendingDeploymentTransaction<TAbi extends Abi = Abi> = DeployFunctionArgs<TAbi> & {
	hash: `0x${string}`;
	artifactObject: Artifact<TAbi>;
};
