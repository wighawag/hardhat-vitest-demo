#! /usr/bin/env node
import fs from 'node:fs';
import {loadAndExecuteDeployments} from '.';
import {Command, Option} from 'commander';
import pkg from '../package.json';
import figlet from 'figlet';
console.log(`------------------------------------------------`);
console.log(figlet.textSync('ahoy sailor !'));
console.log(`------------------------------------------------`);

const commandName = `ahoy`;

const program = new Command();
program
	.name(commandName)
	.version(pkg.version)
	.usage(`${commandName}`)
	.description('execute deploy scripts and store the deployments')
	.option('-s, --scripts <value>', 'path the folder containing the deploy scripts to execute')
	// .addOption(
	// 	new Option('-n, --node-url <value>', `ethereum's node url (fallback on ETHEREUM_NODE env variable)`).env(
	// 		'ETHEREUM_NODE'
	// 	)
	// )
	.option('-t, --tags <value>', 'comma separated list of tags to execute')
	.option('-d, --deployments <value>', 'folder where deployments are saved')
	// .option('-w, --watch', 'watch mode')
	.requiredOption('-n, --network <value>', 'network context to use')
	.parse(process.argv);

const options = program.opts();

type Networks = {[name: string]: {rpcUrl: string}};
type ConfigFile = {networks: Networks};
let configFile: ConfigFile;
try {
	const configString = fs.readFileSync('./ahoy.json', 'utf-8');
	configFile = JSON.parse(configString);
} catch {
	console.error(`could not read ahoy.json`);
	process.exit(1);
}

const network = configFile.networks && configFile.networks[options.network];
if (!network) {
	console.error(`network "${options.network}" is not configured. Please add it to the ahoy.json file`);
}

loadAndExecuteDeployments({
	nodeUrl: network.rpcUrl,
	networkName: options.network,
	deployments: options.deployments,
	scripts: options.scripts,
	tags: options.tags && options.tags.split(','),
});
