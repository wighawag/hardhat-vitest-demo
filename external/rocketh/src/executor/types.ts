import type {
	Artifact,
	Context,
	Environment,
	UnknownArtifacts,
	UnknownDeployments,
	UnknownNamedAccounts,
} from '../environment/types';

export type DeployScriptFunction<
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	Deployments extends UnknownDeployments = UnknownDeployments
> = (env: Environment<Artifacts, NamedAccounts, Deployments>) => Promise<void | boolean>;

export interface DeployScriptModule<
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	Deployments extends UnknownDeployments = UnknownDeployments
> {
	(env: Environment<Artifacts, NamedAccounts, Deployments>): Promise<void | boolean>;
	providedContext: ProvidedContext<Artifacts, NamedAccounts>;
	skip?: (env: Environment<Artifacts, NamedAccounts, Deployments>) => Promise<boolean>;
	tags?: string[];
	dependencies?: string[];
	runAtTheEnd?: boolean;
	id?: string;
}

export type ProvidedContext<
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts
> = {
	accounts?: NamedAccounts;
	artifacts: Artifacts;
};

export type ScriptCallback<
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnknownNamedAccounts = UnknownNamedAccounts,
	Deployments extends UnknownDeployments = UnknownDeployments
> = (env: Environment<Artifacts, NamedAccounts, Deployments>) => Promise<void>;
