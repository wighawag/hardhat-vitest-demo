# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
pnpm i
pnpm test
pnpm hardhat deploy # this will do nothing as this all happen in memory
```

to test against a network, boot up a node

```shell
pnpm hardhat node
```

and then deploy

```shell
pnpm hardhat --network localhost deploy
```

See deployments/localhost folder

# real network

create a .env.local file with the following content

```env
ETH_NODE_URI_sepolia=<node-url>
MNEMONIC_sepolia="<mnemonic that have some sepola ETH>"
ETHERSCAN_API_KEY=<your etherscan api key>
```

Then you can deploy on sepolia

```shell
pnpm hardhat --network sepolia deploy
```

Verify it too (most likely already verified as etherscan will match identical bytecode. Just change the code by adding comments)

etherscan:

```shell
pnpm rocketh-verify etherscan -n sepolia
```

sourcify :

```shell
pnpm rocketh-verify sourcify -n sepolia
```
