const {loadEnv} = require('ldenv');
loadEnv();
require('@nomicfoundation/hardhat-network-helpers');
const {addForkConfiguration, addNetworksFromEnv} = require('hardhat-rocketh');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: '0.8.20',
	networks: addForkConfiguration(addNetworksFromEnv()),
};
