import {
	EIP1193LegacySignRequest,
	EIP1193PTypedSignRequest,
	EIP1193PTypedSignv4Request,
	EIP1193PersonalSignRequest,
	EIP1193SignTransactionRequest,
	EIP1193SignerProvider,
	EIP1193ProviderWithoutEvents,
	EIP1193GenericRequest,
	EIP1193AccountsRequest,
	EIP1193Accounts,
} from 'eip-1193';
import {privateKeyToAccount, mnemonicToAccount, LocalAccount} from 'viem/accounts';

type SignatureRequest =
	| EIP1193LegacySignRequest
	| EIP1193SignTransactionRequest
	| EIP1193PersonalSignRequest
	| EIP1193PTypedSignv4Request
	| EIP1193PTypedSignRequest;

function tobn(v?: `0x${string}`): bigint | undefined {
	return v ? BigInt(v) : undefined;
}

function ton(v: `0x${string}` | undefined): number | undefined {
	return v ? parseInt(v.slice(2), 16) : undefined;
}
function tonf(v: `0x${string}`): number {
	return parseInt(v.slice(2), 16);
}

export class EIP1193LocalSigner implements EIP1193SignerProvider {
	private accounts: {[address: `0x${string}`]: LocalAccount<'hd' | 'privateKey'>} = {};
	public readonly addresses: `0x${string}`[] = [];

	constructor(prv: `0x${string}` | {mnemonic: string; num: number}) {
		if (typeof prv === 'string') {
			const account = privateKeyToAccount(prv);
			this.accounts[account.address.toLowerCase() as `0x${string}`] = account;
			this.addresses.push(account.address);
		} else {
			for (let i = 0; i < (isNaN(prv.num) ? 1 : Math.max(prv.num, 1)); i++) {
				const account = mnemonicToAccount(prv.mnemonic, {accountIndex: i});
				this.accounts[account.address.toLowerCase() as `0x${string}`] = account;
				this.addresses.push(account.address);
			}
		}
	}

	request(args: EIP1193AccountsRequest): Promise<EIP1193Accounts>;
	request(args: EIP1193LegacySignRequest): Promise<`0x${string}`>;
	request(args: EIP1193SignTransactionRequest): Promise<`0x${string}`>;
	request(args: EIP1193PersonalSignRequest): Promise<`0x${string}`>;
	request(args: EIP1193PTypedSignv4Request): Promise<`0x${string}`>;
	request(args: EIP1193PTypedSignRequest): Promise<`0x${string}`>;
	async request(args: SignatureRequest | EIP1193AccountsRequest): Promise<`0x${string}` | EIP1193Accounts> {
		const getAccount = (address: `0x${string}`) => {
			const account = this.accounts[address.toLowerCase() as `0x${string}`];
			if (!account) {
				const addresses = Object.keys(this.accounts);
				if (addresses.length === 1) {
					throw new Error(`account (${addresses[0]}) cannot sign for ${address}`);
				} else {
					throw new Error(`no account found that can sign for ${address}`);
				}
			}
			return account;
		};

		if (args.method === 'eth_accounts') {
			return this.addresses;
		}

		// TODO test
		else if (args.method === 'eth_sign') {
			const [address, message] = args.params;
			const account = getAccount(address);
			return account.signMessage({message: {raw: message}});
		} else if (args.method === 'eth_signTransaction') {
			const txData = args.params[0];
			const account = getAccount(txData.from);
			if (!txData.type || txData.type === '0x0') {
				return account.signTransaction({
					type: 'legacy',
					data: txData.data,
					gas: tobn(txData.gas),
					gasPrice: tobn(txData.gasPrice),
					value: tobn(txData.value),
					nonce: ton(txData.nonce),
					to: txData.to,
				});
			} else if (txData.type === '0x1') {
				if (!txData.chainId) {
					throw new Error(`type 0x1 tx need to have the chainId specified`);
				}
				return account.signTransaction({
					type: 'eip2930',
					chainId: tonf(txData.chainId),
					accessList: txData.accessList,
					data: txData.data,
					gas: tobn(txData.gas),
					gasPrice: tobn(txData.gasPrice),
					value: tobn(txData.value),
					nonce: ton(txData.nonce),
					to: txData.to,
				});
			} else if (txData.type === '0x2') {
				if (!txData.chainId) {
					throw new Error(`type 0x1 tx need to have the chainId specified`);
				}
				return account.signTransaction({
					type: 'eip1559',
					chainId: tonf(txData.chainId),
					accessList: txData.accessList,
					data: txData.data,
					gas: tobn(txData.gas),
					maxFeePerGas: tobn(txData.maxFeePerGas),
					maxPriorityFeePerGas: tobn(txData.maxPriorityFeePerGas),
					value: tobn(txData.value),
					nonce: ton(txData.nonce),
					to: txData.to,
				});
			} else {
				throw new Error(`unlnown transaction type: ${txData.type}`);
			}
		} else if (args.method === 'eth_signTypedData') {
			const [address, message] = args.params;
			const account = getAccount(address);
			return account.signTypedData(message as any);
		} else if (args.method === 'eth_signTypedData_v4') {
			const [address, message] = args.params;
			const account = getAccount(address);
			return account.signTypedData(message as any);
		} else if (args.method === 'personal_sign') {
			const [message, address] = args.params; // reverse
			const account = getAccount(address);
			return account.signMessage({message: {raw: message}});
		} else {
			throw new Error(`do not support method "${(args as any).method}"`);
		}
	}
}

const signingRequests = [
	'eth_sign',
	'eth_signTransaction',
	'personal_sign',
	'eth_signTypedData_v4',
	'eth_signTypedData',
];

export function wrapProviderWithMultipleSigners<T extends EIP1193ProviderWithoutEvents>(
	provider: T
): {provider: T; registerAccount(address: `0x${string}`, signer: EIP1193SignerProvider): void} {
	const accounts: {[address: `0x${string}`]: EIP1193SignerProvider} = {};
	function registerAccount(address: `0x${string}`, signer?: EIP1193SignerProvider) {
		accounts[address] = signer || provider; // pass through
	}

	function request(args: EIP1193GenericRequest): Promise<any> {
		if (signingRequests.indexOf(args.method) >= 0) {
			const request = args as SignatureRequest;
			let address: `0x${string}`;
			if (typeof request.params[0] === 'string') {
				address = request.params[0];
			} else if ('from' in request.params[0]) {
				address = request.params[0].from;
			} else {
				throw new Error(`signing request not supported: ${args.method}`);
			}
			const signer = accounts[address];
			if (!signer) {
				throw new Error(`no signer registered for ${address}`);
			}
			return signer.request(request as any);
		}
		return provider.request(args);
	}
	const newProvider = new Proxy(provider, {
		get(target, param, receiver) {
			if (param === 'request') {
				return request;
			}
			return (target as any)[param];
		},
	});

	return {
		provider: newProvider,
		registerAccount,
	};
}

export function wrapProviderWithLocalSigner<T extends EIP1193ProviderWithoutEvents>(
	provider: T,
	prv: `0x${string}` | {mnemonic: string; num: number}
): T {
	const signer = new EIP1193LocalSigner(prv);
	function request(args: EIP1193GenericRequest): Promise<any> {
		if (signingRequests.indexOf(args.method) >= 0) {
			return signer.request(args as any);
		}
		return provider.request(args);
	}
	return new Proxy(provider, {
		get(target, param, receiver) {
			if (param === 'request') {
				return request;
			}
			return (target as any)[param];
		},
	});
}
