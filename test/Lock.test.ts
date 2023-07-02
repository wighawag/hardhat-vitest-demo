import {expect, describe, it} from 'vitest';

import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';

import {loadAndExecuteDeployments} from 'rocketh';

import {getConnection, fetchContract} from './connection';

import artifacts from '../generated/artifacts';

const ONE_YEAR_IN_SECS = 365n * 24n * 60n * 60n;
const ONE_GWEI = 1_000_000_000n;

async function deployLock(delta: bigint) {
	const lockedAmount = ONE_GWEI;
	const unlockTime = BigInt(await time.latest()) + delta;

	const {accounts, walletClient, publicClient} = await getConnection();

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
		throw new Error(`failed to deploy contract`);
	}

	return {
		lock: await fetchContract({address: receipt.contractAddress, abi: artifacts.Lock.abi}),
		unlockTime,
		lockedAmount,
		owner,
		otherAccounts,
		walletClient,
		publicClient,
	};
}

async function deployOneYearLockFixture() {
	return deployLock(ONE_YEAR_IN_SECS);
}

describe('Lock', function () {
	describe('Deployment', function () {
		it('Should be already deployed', async function () {
			const {provider} = await getConnection();
			const {deployments} = await loadAndExecuteDeployments({
				provider,
			});
			const lock = await fetchContract(deployments['Lock']);
			const unlockTime = await lock.read.unlockTime();
			expect(unlockTime).to.equal(0n); // TODO 1900000000n
		});

		it('Should set the right unlockTime', async function () {
			const {lock, unlockTime, owner} = await loadFixture(deployOneYearLockFixture);
			expect(await lock.read.unlockTime()).to.equal(unlockTime);
		});

		it('Should set the right owner', async function () {
			const {lock, owner} = await loadFixture(deployOneYearLockFixture);
			expect(await lock.read.owner()).to.equal(owner);
		});

		it('Should receive and store the funds to lock', async function () {
			const {lock, lockedAmount, publicClient} = await loadFixture(deployOneYearLockFixture);
			expect(await publicClient.getBalance({address: lock.address})).to.equal(lockedAmount);
		});

		it('Should fail if the unlockTime is not in the future', async function () {
			await expect(() => deployLock(0n)).rejects.toThrowError();
		});
	});

	describe('Withdrawals', function () {
		describe('Validations', function () {
			it('Should revert with the right error if called too soon', async function () {
				const {lock, owner} = await loadFixture(deployOneYearLockFixture);
				await expect(() =>
					lock.write.withdraw({
						account: owner,
					})
				).rejects.toThrow("You can't withdraw yet");
			});

			it('Should revert with the right error if called from another account', async function () {
				const {lock, unlockTime, otherAccounts} = await loadFixture(deployOneYearLockFixture);

				// We can increase the time in Hardhat Network
				await time.increaseTo(unlockTime);

				await expect(() =>
					lock.write.withdraw({
						account: otherAccounts[0],
					})
				).rejects.toThrow("You aren't the owner");
			});

			it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
				const {lock, unlockTime, owner} = await loadFixture(deployOneYearLockFixture);
				await time.increaseTo(unlockTime);
				await lock.write.withdraw({
					account: owner,
				});
			});
		});

		describe('Events', function () {
			it('Should emit an event on withdrawals', async function () {
				const {lock, unlockTime, lockedAmount, owner} = await loadFixture(deployOneYearLockFixture);
				await time.increaseTo(unlockTime);
				await lock.write.withdraw({
					account: owner,
				});
				// emit 'Withdrawal' withArgs (lockedAmount, anyValue);
			});
		});

		describe('Transfers', function () {
			it('Should transfer the funds to the owner', async function () {
				const {lock, unlockTime, lockedAmount, owner} = await loadFixture(deployOneYearLockFixture);
				await time.increaseTo(unlockTime);
				await lock.write.withdraw({
					account: owner,
				});
				//await expect(lock.withdraw()).to.changeEtherBalances([owner, lock], [lockedAmount, -lockedAmount]);
			});
		});
	});
});
