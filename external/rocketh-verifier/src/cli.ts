import {loadEnv} from 'ldenv';
loadEnv();
import {readAndResolveConfig} from 'rocketh';
import {run} from '.';

const args = process.argv.slice(2);

const resolvedConfig = readAndResolveConfig({network: args[0]}, {ignoreMissingRPC: true});

run(resolvedConfig, {verifier: {type: 'etherscan', apiKey: process.env['ETHERSCAN_API_KEY']}, logErrorOnFailure: true});
