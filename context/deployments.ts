export default {
	hardhat: {
		Lock: {
			address: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
			abi: [
				{
					inputs: [{internalType: 'uint256', name: '_unlockTime', type: 'uint256'}],
					stateMutability: 'payable',
					type: 'constructor',
				},
				{
					anonymous: false,
					inputs: [
						{indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256'},
						{indexed: false, internalType: 'uint256', name: 'when', type: 'uint256'},
					],
					name: 'Withdrawal',
					type: 'event',
				},
				{
					inputs: [],
					name: 'owner',
					outputs: [{internalType: 'address payable', name: '', type: 'address'}],
					stateMutability: 'view',
					type: 'function',
				},
				{
					inputs: [],
					name: 'unlockTime',
					outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
					stateMutability: 'view',
					type: 'function',
				},
				{inputs: [], name: 'withdraw', outputs: [], stateMutability: 'nonpayable', type: 'function'},
			],
			txHash: '0x73a7478ab35509c6859c31eadae347c56e21a9b2a0e6b092d89c28f80b79b1d7',
		},
	},
	localhost: {
		Lock: {
			address: '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
			abi: [
				{
					inputs: [{internalType: 'uint256', name: '_unlockTime', type: 'uint256'}],
					stateMutability: 'payable',
					type: 'constructor',
				},
				{
					anonymous: false,
					inputs: [
						{indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256'},
						{indexed: false, internalType: 'uint256', name: 'when', type: 'uint256'},
					],
					name: 'Withdrawal',
					type: 'event',
				},
				{
					inputs: [],
					name: 'owner',
					outputs: [{internalType: 'address payable', name: '', type: 'address'}],
					stateMutability: 'view',
					type: 'function',
				},
				{
					inputs: [],
					name: 'unlockTime',
					outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
					stateMutability: 'view',
					type: 'function',
				},
				{inputs: [], name: 'withdraw', outputs: [], stateMutability: 'nonpayable', type: 'function'},
			],
			txHash: '0x8fa8e22966cdcc0ed491aa29df571a03c68856d967e9618021cbf49945e47235',
		},
	},
} as const;
