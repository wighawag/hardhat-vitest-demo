import type {
	AfterSuiteRunMeta,
	CoverageProvider,
	CoverageProviderModule,
	ReportContext,
	ResolvedCoverageOptions,
	Vitest,
} from 'vitest';
import CoverageAPI from 'solidity-coverage/api';
import utils from 'solidity-coverage/utils';
import env from 'hardhat';
import {HARDHAT_NETWORK_RESET_EVENT} from 'hardhat/internal/constants';
import PluginUI from './resources/nomiclabs.ui';
import nomiclabsUtils from './resources/nomiclabs.utils';
import fs from 'fs';

let state: {
	api?: CoverageAPI;
	config?: any;
} = {};

async function setupCoverage() {
	// TODO args like compile-for-coverage
	const args = {};

	const config = (state.config = nomiclabsUtils.normalizeConfig(env.config, args));
	const ui = new PluginUI(config.logger.log);
	// TODO solccover file: api = new API(utils.loadSolcoverJS(config));
	const api = (state.api = new CoverageAPI(config));
	const data = JSON.parse(fs.readFileSync('coverage-data.json', 'utf-8'));
	api.setInstrumentationData(data);

	let network = await nomiclabsUtils.setupHardhatNetwork(env, api, ui);

	const accounts = await utils.getAccountsHardhat(network.provider);
	const nodeInfo = await utils.getNodeInfoHardhat(network.provider);

	// Note: this only works if the reset block number is before any transactions have fired on the fork.
	// e.g you cannot fork at block 1, send some txs (blocks 2,3,4) and reset to block 2
	network.provider.on(HARDHAT_NETWORK_RESET_EVENT, async () => {
		await api.attachToHardhatVM(network.provider);
	});

	await api.attachToHardhatVM(network.provider);

	ui.report('hardhat-network', [nodeInfo.split('/')[1], env.network.name]);

	// Set default account (if not already configured)
	nomiclabsUtils.setNetworkFrom(network.config, accounts);

	// Run post-launch server hook;
	await api.onServerReady(config);

	nomiclabsUtils.collectTestMatrixData(args, env, api);
}

async function onTestComplete() {
	const api = state.api;
	const config = state.config;
	if (!api) {
		throw new Error(`api undefined`);
	}
	if (!config) {
		throw new Error(`config undefined`);
	}
	console.log('stopCoverage');
	await api.onTestsComplete(config);

	// =================================
	// Output (Istanbul or Test Matrix)
	// =================================
	// TODO args
	// args.matrix ? await api.saveTestMatrix() : await api.report();
	await api.report();

	await api.onIstanbulComplete(config);
}

function appendToLog(msg: string) {
	let content = '';
	try {
		content = fs.readFileSync('./log.txt', 'utf-8');
	} catch {}
	content += msg + `\n`;
	fs.writeFileSync('./log.txt', content);
}

const CustomCoverageProviderModule: CoverageProviderModule = {
	getProvider(): CoverageProvider {
		console.log('getProvider');
		appendToLog('getProvider');

		return new CustomCoverageProvider();
	},

	async startCoverage() {
		console.log('startCoverage');
		appendToLog('startCoverage');
	},

	async stopCoverage() {
		appendToLog('stopCoverage');
	},

	takeCoverage() {
		console.log('takeCoverage');
		appendToLog('takeCoverage');
	},

	// Implements rest of the CoverageProviderModule ...
};

class CustomCoverageProvider implements CoverageProvider {
	resolveOptions(): ResolvedCoverageOptions {
		console.log('resolveOptions');
		appendToLog('resolveOptions');
		// throw new Error('Method not implemented.');
		return {} as any;
	}
	clean(clean?: boolean | undefined): void | Promise<void> {
		console.log('clean', clean);
		appendToLog('clean');
		// throw new Error('Method not implemented.');
	}
	async onAfterSuiteRun(meta: AfterSuiteRunMeta) {
		console.log(`meta`, meta);
		appendToLog('meta');
		// throw new Error('Method not implemented.');
	}
	async reportCoverage(reportContext?: ReportContext | undefined) {
		console.log(`reportCoverage`, reportContext);
		appendToLog('reportCoverage');
		// throw new Error('Method not implemented.');

		await onTestComplete();
	}
	onFileTransform?(
		sourceCode: string,
		id: string,
		pluginCtx: any //: // | (string | void | Partial<TransformResult> | null | undefined) // | Promise<string | void | Partial<TransformResult> | null | undefined>
	) {
		console.log(`onFileTransform`, id);
		appendToLog('onFileTransform');
		// throw new Error('Method not implemented.');
		return sourceCode;
	}
	name = 'custom-coverage-provider';
	options!: ResolvedCoverageOptions;

	async initialize(ctx: Vitest) {
		console.log('initialize');
		appendToLog('initialize');
		this.options = ctx.config.coverage;

		await setupCoverage();
	}

	// Implements rest of the CoverageProvider ...
}

export default CustomCoverageProviderModule;
