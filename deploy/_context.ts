import artifacts from '../generated/artifacts';

export const context = {
	accounts: {
		// TODO accounts per network, with index, etc...
		deployer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
		// deployer: '0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20',
	},
	artifacts,
} as const;
