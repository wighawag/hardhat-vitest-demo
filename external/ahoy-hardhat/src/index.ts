import fs from 'node:fs';

import type {Context} from 'ahoy';

import {subtask, task} from 'hardhat/config';
import {TASK_COMPILE_SOLIDITY_EMIT_ARTIFACTS} from 'hardhat/builtin-tasks/task-names';
import {loadAndExecuteDeployments} from 'ahoy';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {HardhatPluginError} from 'hardhat/plugins';

function setNetwork(hre: HardhatRuntimeEnvironment) {
	fs.writeFileSync('./context/currentNetwork.ts', `export default "${hre.network.name}" as const;`);
	console.log(`switched to network "${hre.network.name}"`);
}

const ahoy: {context: Context<string>} = {
	context: {
		network: 'memory',
		accounts: {},
		artifacts: {},
	},
};

function ensureCorrectNetworkDefined(hre: HardhatRuntimeEnvironment) {
	if (hre.network.name !== ahoy.context.network) {
		setNetwork(hre);
		throw new HardhatPluginError(
			'ahoy',
			`please reexecute as we switched network. This allow typescript to get type-safety on deployments pertaining to the current network for example.`
		);
	}
}

task('deploy', 'Deploy contracts').setAction(async (args, hre) => {
	ensureCorrectNetworkDefined(hre);
	await loadAndExecuteDeployments({
		provider: hre.network.provider as unknown as any,
	});
});

task('network').setAction(async (args, hre) => {
	setNetwork(hre);
});

task('run').setAction(async (args, hre, runSuper) => {
	ensureCorrectNetworkDefined(hre);
	return runSuper(args);
});

task('test').setAction(async (args, hre, runSuper) => {
	ensureCorrectNetworkDefined(hre);
	return runSuper(args);
});

subtask(TASK_COMPILE_SOLIDITY_EMIT_ARTIFACTS).setAction(async (args, _, runSuper): Promise<any> => {
	const allArtifacts: {[name: string]: any} = {}; // TODO read current ?
	const artifactResult = await runSuper(args);
	const shortNameDict: {[shortName: string]: boolean} = {};
	for (const artifact of artifactResult.artifactsEmittedPerFile) {
		const filepath = `./artifacts/${artifact.file.sourceName}/${artifact.artifactsEmitted[0]}.json`;
		if (fs.existsSync(filepath)) {
			for (let i = 0; i < artifact.artifactsEmitted.length; i++) {
				const shortName = artifact.artifactsEmitted[i];
				const content = fs.readFileSync(filepath, 'utf-8');
				const parsed = JSON.parse(content);
				const artifactObject = {abi: parsed.abi, bytecode: parsed.bytecode};
				const fullName = `${artifact.file.sourceName}/${shortName}`;
				allArtifacts[fullName] = artifactObject;
				if (shortNameDict[shortName]) {
					delete allArtifacts[shortName];
				} else {
					allArtifacts[shortName] = artifactObject;
					shortNameDict[shortName] = true;
				}
			}
		} else {
			throw new Error(`no artifact at ${filepath}`);
		}
	}
	for (const key of Object.keys(allArtifacts)) {
		console.log({key});
		if (key.indexOf('/') >= 0) {
			const split = key.split('/');
			if (split.length > 1) {
				const shortName = split[split.length - 1];
				console.log({shortName});
				if (allArtifacts[shortName]) {
					console.log(`deleting: ${key}`);
					delete allArtifacts[key];
				}
			}
		}
	}
	const newContent = `export default ${JSON.stringify(allArtifacts, null, 2)} as const;`;
	fs.writeFileSync('./context/artifacts.ts', newContent);
	return artifactResult;
});

export function setContext(context: Context<string>) {
	ahoy.context = context;
}
