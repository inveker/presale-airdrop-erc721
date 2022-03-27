const { ethers } = require('hardhat');
const nftConstructorArgs = require('./nft_constructor_args.js');

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log(`Deployer address: ${deployer.address}`);

    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy(nftConstructorArgs[0]);

    console.log(`Contract address: ${nft.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });