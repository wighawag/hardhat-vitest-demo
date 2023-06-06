import {Abi} from 'abitype';
import type {Artifact, DeploymentConstruction, Deployment, Environment} from 'rocketh';
import 'rocketh-deploy';
import type {EIP1193Account} from 'eip-1193';
import {extendEnvironment} from 'rocketh';
import {Chain, DeployContractParameters, encodeAbiParameters, encodeDeployData, encodeFunctionData} from 'viem';
import artifacts from 'ethereum-deploy-proxy/generated/artifacts';

export type ProxyDeployOptions = {
	disabled?: boolean;
	owner: EIP1193Account;
};

export type DeployViaProxyFunction = <TAbi extends Abi, TChain extends Chain = Chain>(
	name: string,
	args: DeploymentConstruction<TAbi, TChain>,
	options?: ProxyDeployOptions
) => Promise<Deployment<TAbi>>;

declare module 'rocketh' {
	interface Environment {
		deployViaProxy: DeployViaProxyFunction;
	}
}

extendEnvironment((env: Environment) => {
	async function deployViaProxy<TAbi extends Abi, TChain extends Chain = Chain>(
		name: string,
		args: DeploymentConstruction<TAbi>, // TODO omit nonce ? // TODO omit chain ? same for rocketh-deploy
		options?: ProxyDeployOptions
	): Promise<Deployment<TAbi>> {
		const proxyName = `${name}_Proxy`;
		const implementationName = `${name}_Implementation`;

		const {account, artifact, ...viemArgs} = args;
		// TODO throw specific error if artifact not found
		const artifactToUse = (typeof artifact === 'string' ? env.artifacts[artifact] : artifact) as Artifact<TAbi>;

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

		const proxyArtifact = artifacts.EIP173Proxy;

		const implementation = await env.deploy(implementationName, {
			...args,
		});

		let existingDeployment = env.get<TAbi>(name);

		const owner = options?.owner || address;

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

		if (!existingDeployment) {
			const proxy = await env.deploy<typeof artifacts.EIP173Proxy.abi>(proxyName, {
				...args,
				artifact: proxyArtifact,
				args: [implementation.address, owner, argsData],
			});

			existingDeployment = await env.save<TAbi>(name, {
				...proxy,
				...artifactToUse,
			});
		} else {
			const proxyDeployment = env.get(proxyName);
			if (!proxyDeployment) {
				throw new Error(`deployment for "${name}" exits but there is no proxy`);
			}

			const currentImplementationAddress = '' as `0x${string}`; // TODO fetch from storage
			if (currentImplementationAddress.toLowerCase() === implementation.address.toLowerCase()) {
				// TODO upgradeToAndCall
				encodeFunctionData({abi: proxyArtifact.abi, functionName: 'upgradeTo', args: [implementation.address]});
			}
			existingDeployment = await env.save(name, {
				...proxyDeployment,
				...artifactToUse,
			});
		}
		return existingDeployment;
	}

	env.deployViaProxy = deployViaProxy;
	return env;
});
