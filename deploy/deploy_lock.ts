import {execute} from 'rocketh';
import {context} from './_context';

export default execute(
	context,
	async ({deploy, accounts, artifacts}) => {
		const contract = await deploy('Lock', {
			account: accounts.deployer,
			artifact: artifacts.Lock,
			args: [1900000000n],
		});
	},
	{tags: ['Lock', 'Lock_deploy']}
);
