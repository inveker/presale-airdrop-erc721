require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require('dotenv').config()
require("@nomiclabs/hardhat-etherscan");

module.exports = {
    solidity: '0.8.9',
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            accounts: {
                count: 500,
            },
        },
        ropsten: {
            url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ROPSTEN_ALCHEMY_API_KEY}`,
            accounts: [`${process.env.ROPSTEN_PRIVATE_KEY}`],
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
      },
    mocha: {
        reporter: 'eth-gas-reporter',
        timeout: 300000,
    },
};