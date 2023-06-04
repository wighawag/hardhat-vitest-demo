import {Config} from '../environment/types';

export type ResolvedConfig = Config & {deployments: string; scripts: string; tags: string[]};

export type InternalEnvironment = {
	exportDeploymentsAsTypes(): Promise<void>;
	recoverTransactionsIfAny(): Promise<void>;
};
