#! /usr/bin/env node

import {Config, loadAndExecuteDeployments} from './';
import {Command, Option} from 'commander';
import pkg from '../package.json';
import figlet from 'figlet';
console.log(`------------------------------------------------`);
console.log(figlet.textSync('ahoy sailor !'));
console.log(`------------------------------------------------`);

const program = new Command();
program
	.name('ahoy')
	.version(pkg.version)
	.usage(`ahoy [-s <folder path> -n http://127.0.0.1:8545]`)
	.description('deploy')
	.option('-s, --scripts <value>', 'path the folder containing the deploy scripts to execute')
	.addOption(
		new Option('-n, --node-url <value>', `ethereum's node url (fallback on ETHEREUM_NODE env variable)`).env(
			'ETHEREUM_NODE'
		)
	)
	.option('-d, --deployments <value>', 'folder where deployments are saved')
	.option('-w, --watch', 'watch mode')
	.parse(process.argv);

const options = program.opts();

// TODO commander typecheck ?
loadAndExecuteDeployments(options as Config);
