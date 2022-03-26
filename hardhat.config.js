require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");

module.exports = {
    solidity: '0.8.9',
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            accounts: {
                count: 500,
            },
        },
    },
    mocha: {
        reporter: 'eth-gas-reporter',
        timeout: 300000,
    },
};