require('@nomicfoundation/hardhat-ethers');
require('@nomicfoundation/hardhat-chai-matchers');

const {setContext} = require('ahoy-hardhat');
const {context} = require('./context');
setContext(context);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: '0.8.18',
};
