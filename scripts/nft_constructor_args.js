const fs = require('fs');
const {generateMerkleTree} = require('./airdrop.js');

module.exports = [
    getAirdropMerkleRoot(),
];

function getAirdropMerkleRoot() {
    const airdropAddresses = getAirdropAddresses();
    const merkleTree = generateMerkleTree(airdropAddresses);
    return merkleTree.getHexRoot();
}

function getAirdropAddresses() {
    let airdropAddresses;
    try {
        airdropAddresses = fs.readFileSync('airdrop_addresses.txt', 'utf8').split(/\s+/);
    } catch (err) {
        throw '[ERROR] airdrop_addresses.txt not found. Create by example: airdrop_addresses.txt.example';
    }
    
    if(airdropAddresses.length != 100) {
        throw "[ERROR] The number of airdrop addresses must be equal to 100. Add to airdrop_addresses.txt";
    }
    for(let address of airdropAddresses) {
        if(!ethers.utils.isAddress(address)) {
            throw `[ERROR] This "${address}" is not an address.`;
        }
    }
    return airdropAddresses;
}
