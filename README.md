# Solidity test work

## Install

    npm i

## Test

    npx hardhat test
    
## Deploy
1. Create .env (use .env.example by example)
2. Create airdrop_addresses.txt in project root folder (use airdrop_addresses.txt.example by example)
3. Call command:
   
        npm run deploy -- --network ropsten

## Verify

    npm run verify -- CONTACRT_ADDRESS --network ropsten

## Description
Smart contract implements ERC721.

*Features:*

1. Presale
2. Public sale
3. Merkle-Airdrop

## Documentation

Create new token

    function mint() payable

Get airdrop token

    function claimAirDrop(bytes32[] calldata _merkleProof)

Check can claimer get airdrop

    function canClaimAirDrop(address _claimer, bytes32[] calldata _merkleProof) returns (bool)

Withdraw founds

    function withdraw() onlyOwner
    
