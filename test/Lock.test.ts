import {expect, describe, it} from 'vitest';
import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';

import {loadAndExecuteDeployments} from 'ahoy';

import {accounts, walletClient, contract, publicClient} from './viem';

import artifacts from '../generated/artifacts';

const ONE_YEAR_IN_SECS = 365n * 24n * 60n * 60n;
const ONE_GWEI = 1_000_000_000n;

async function deployLock(delta: bigint) {
	const lockedAmount = ONE_GWEI;
	const unlockTime = BigInt(await time.latest()) + delta;

	const [owner, ...otherAccounts] = accounts;
	const hash = await walletClient.deployContract({
		abi: artifacts.Lock.abi,
		bytecode: artifacts.Lock.bytecode,
		account: owner,
		args: [unlockTime],
		value: lockedAmount,
	} as any); // TODO https://github.com/wagmi-dev/viem/issues/648

	const receipt = await publicClient.waitForTransactionReceipt({hash});

	if (!receipt.contractAddress) {
		throw new Error(`failed to deploy contract ${name}`);
	}

	return {
		lock: contract(receipt.contractAddress, artifacts.Lock.abi),
		unlockTime,
		lockedAmount,
		owner,
		otherAccounts,
	};
}

async function deployOneYearLockFixture() {
	return deployLock(ONE_YEAR_IN_SECS);
}

describe('Lock', function () {
	// We define a fixture to reuse the same setup in every test.
	// We use loadFixture to run this setup once, snapshot that state,
	// and reset Hardhat Network to that snapshot in every test.

	describe('Deployment', function () {
		it('Should set the right unlockTime', async function () {
			const {lock, unlockTime, owner} = await loadFixture(deployOneYearLockFixture);

			expect(
				await publicClient.readContract({
					...lock,
					functionName: 'unlockTime',
				})
			).to.equal(unlockTime);
			// await lock.write.withdraw({
			// 	account: owner,
			// });
			// await lock.unlockTime())
		});

		it('Should set the right owner', async function () {
			const {lock, owner} = await loadFixture(deployOneYearLockFixture);

			expect(
				await publicClient.readContract({
					...lock,
					functionName: 'owner',
				})
			).to.equal(owner);
		});

		it('Should receive and store the funds to lock', async function () {
			const {lock, lockedAmount} = await loadFixture(deployOneYearLockFixture);

			expect(await publicClient.getBalance({address: lock.address})).to.equal(lockedAmount);
		});

		it('Should fail if the unlockTime is not in the future', async function () {
			await expect(() => deployLock(0n)).rejects.toThrowError();
		});
	});

	// describe('Withdrawals', function () {
	// 	describe('Validations', function () {
	// 		it('Should revert with the right error if called too soon', async function () {
	// 			const {lock} = await loadFixture(deployOneYearLockFixture);

	// 			await expect(lock.withdraw()).to.be.revertedWith("You can't withdraw yet");
	// 		});

	// 		it('Should revert with the right error if called from another account', async function () {
	// 			const {lock, unlockTime, otherAccount} = await loadFixture(deployOneYearLockFixture);

	// 			// We can increase the time in Hardhat Network
	// 			await time.increaseTo(unlockTime);

	// 			// We use lock.connect() to send a transaction from another account
	// 			await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith("You aren't the owner");
	// 		});

	// 		it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
	// 			const {lock, unlockTime} = await loadFixture(deployOneYearLockFixture);

	// 			// Transactions are sent using the first signer by default
	// 			await time.increaseTo(unlockTime);

	// 			await expect(lock.withdraw()).not.to.be.reverted;
	// 		});
	// 	});

	// 	describe('Events', function () {
	// 		it('Should emit an event on withdrawals', async function () {
	// 			const {lock, unlockTime, lockedAmount} = await loadFixture(deployOneYearLockFixture);

	// 			await time.increaseTo(unlockTime);

	// 			await expect(lock.withdraw()).to.emit(lock, 'Withdrawal').withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
	// 		});
	// 	});

	// 	describe('Transfers', function () {
	// 		it('Should transfer the funds to the owner', async function () {
	// 			const {lock, unlockTime, lockedAmount, owner} = await loadFixture(deployOneYearLockFixture);

	// 			await time.increaseTo(unlockTime);

	// 			await expect(lock.withdraw()).to.changeEtherBalances([owner, lock], [lockedAmount, -lockedAmount]);
	// 		});
	// 	});
	// });
});
