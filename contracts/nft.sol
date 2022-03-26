// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract NFT is ERC721, Ownable {
    // ------------------------------------------
    // -----------   CONSTANTS  -----------------
    // ------------------------------------------

    uint256 public constant SUPPLY_LIMIT = 5000;

    uint256 public constant PRICE_PUBLIC = 0.07 ether;

    uint256 public constant PRICE_PRESALE = 0.06 ether;

    uint256 public constant MAX_MINT_ONE_TIME = 10;

    uint256 public constant MAX_PRESALE_HOLDER_SUPPLY = 3;

    uint256 public constant PRESALE_TIMEOUT = 2 days;

    uint256 public immutable DEPLOYMENT_TIMESTAMP;

    bytes32 public immutable AIRDROP_MERKLE_ROOT;

    // ------------------------------------------
    // ------------   STORAGE  ------------------
    // ------------------------------------------

    uint256 public reservedTokenForAirDrop = 100;

    uint256 public reservedHoldersCountForPresale = 100;

    uint256 public tokensCount;

    mapping(address => bool) public claimedAirDrop;

    mapping(address => uint256) public presaleTokensOnHolder;

    // ------------------------------------------
    // -------------   EVENTS  ------------------
    // ------------------------------------------

    event AirDropClaimed(address indexed claimer, uint256 tokenId);

    // ------------------------------------------
    // -------------   ERRORS  ------------------
    // ------------------------------------------

    error PermissionDenied();

    error LimitQuantity();

    error AddressCallFailure();

    error NotEnoughFunds();

    // ------------------------------------------
    // ----------   CONSTRUCTOR  ----------------
    // ------------------------------------------

    constructor(bytes32 _airDropMerkleRoot) ERC721("NftCollection", "NFTC") {
        DEPLOYMENT_TIMESTAMP = block.timestamp;
        AIRDROP_MERKLE_ROOT = _airDropMerkleRoot;
    }

    // ------------------------------------------
    // ------------   ACTIONS  ------------------
    // ------------------------------------------

    function mint() external payable {
        uint256 price;
        uint256 limit;

        bool isPublicSale = block.timestamp - DEPLOYMENT_TIMESTAMP >
            PRESALE_TIMEOUT;

        // Public sale
        if (isPublicSale) {
            price = PRICE_PUBLIC;
            limit = MAX_MINT_ONE_TIME;
        }
        // Presale
        else {
            // New holder
            if (presaleTokensOnHolder[msg.sender] == 0) {
                if (reservedHoldersCountForPresale == 0) revert LimitQuantity();

                reservedHoldersCountForPresale--;
            }
            // Existing holder
            else if (
                presaleTokensOnHolder[msg.sender] == MAX_PRESALE_HOLDER_SUPPLY
            ) revert LimitQuantity();

            price = PRICE_PRESALE;
            limit =
                MAX_PRESALE_HOLDER_SUPPLY -
                presaleTokensOnHolder[msg.sender];

            if(limit == 0) revert LimitQuantity();
        }

        // Calc count
        uint256 count = msg.value / price;

        if(count == 0) revert NotEnoughFunds();

        if (count > limit) count = limit;

        // Mint
        for (uint256 i; i < count; i++) {
            _mintToken(msg.sender);
        }

        // Update presale
        if (!isPublicSale) {
            presaleTokensOnHolder[msg.sender] += count;
        }

        // Call user by send change
        _sendChange(msg.value, price * count);
    }

    function claimAirDrop(bytes32[] calldata _merkleProof) external {
        if (!canClaimAirDrop(msg.sender, _merkleProof))
            revert PermissionDenied();

        reservedTokenForAirDrop--;

        claimedAirDrop[msg.sender] = true;

        emit AirDropClaimed(msg.sender, _mintToken(msg.sender));
    }

    function canClaimAirDrop(address _claimer, bytes32[] calldata _merkleProof)
        public
        view
        returns (bool)
    {
        return
            !claimedAirDrop[_claimer] &&
            MerkleProof.verify(
                _merkleProof,
                AIRDROP_MERKLE_ROOT,
                keccak256(abi.encodePacked(_claimer))
            );
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        if (!success) revert AddressCallFailure();
    }

    // ------------------------------------------
    // ------------   METHODS  ------------------
    // ------------------------------------------

    function _sendChange(uint256 _total, uint256 _price) internal {
        assert(_total >= _price);

        uint256 change = _total - _price;

        if (change > 0) {
            (bool success, ) = payable(msg.sender).call{value: change}("");

            if (!success) revert AddressCallFailure();
        }
    }

    function _mintToken(address to) internal returns (uint256) {
        if (tokensCount >= SUPPLY_LIMIT - reservedTokenForAirDrop)
            revert LimitQuantity();

        _safeMint(to, tokensCount);
        return tokensCount++;
    }
}
