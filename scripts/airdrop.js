const { default: MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

module.exports = {
    generateMerkleTree(addresses) {
        return new MerkleTree(
            addresses,
            keccak256,
            { hashLeaves: true, sortPairs: true, },
        );
    },
    getAirDropProof(merkleTree, address) {
        return merkleTree.getHexProof(keccak256(address));
    }
}