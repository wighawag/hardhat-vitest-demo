import {readAndResolveConfig} from 'rocketh';
import {run} from '.';

const resolvedConfig = readAndResolveConfig({network: 'localhost'});

run(resolvedConfig, {verifier: {type: 'etherscan'}});
