import {createFn} from 'ahoy';
import artifacts from '../generated/artifacts';
const accounts = {
	deployer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
} as const;

export default createFn(
	{
		accounts,
		artifacts,
	},
	async ({deploy, accounts, artifacts, deployments}) => {
		const contract = await deploy('Lock', {
			account: accounts.deployer,
			artifact: artifacts.Lock,
			args: [1900000000n],
		});
	},
	{tags: ['Lock', 'Lock_deploy']}
);
