import {execute} from 'rocketh';
import 'rocketh-deploy-proxy';
import {context} from './_context';

export default execute(
	context,
	async ({deployViaProxy, accounts, artifacts}) => {
		const contract = await deployViaProxy(
			'Lock',
			{
				account: accounts.deployer,
				artifact: artifacts.Lock,
				args: [1900000000n],
			},
			{
				owner: accounts.deployer,
			}
		);
	},
	{tags: ['Lock', 'Lock_deploy']}
);
