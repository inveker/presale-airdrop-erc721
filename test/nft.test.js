const { ethers, network } = require('hardhat');
const { expect } = require("chai");
const { generateMerkleTree, getAirDropProof } = require('../scripts/airdrop.js');

// Enable logger in catchs blocks
// true = ON, false = OFF
// see function [debugLog]
const DEBUG_LOGS = false;

describe("nft.sol contract", () => {
    // ------------------------------------------
    // ----------   COMMON DATA  ----------------
    // ------------------------------------------

    // Users
    let owner;
    let simpleUsers;
    let airDropUsers;

    // Contracts
    let nft;

    // AirDrop data
    let merkleTree;

    // ------------------------------------------
    // -----------   BEFOREEACH  ----------------
    // ------------------------------------------

    beforeEach(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        airDropUsers = signers.slice(1, 101);
        simpleUsers = signers.slice(101, 301);

        // Airdrop merkle tree
        merkleTree = generateMerkleTree(airDropUsers.map(i => i.address));

        // Deploy
        const NFT = await ethers.getContractFactory("NFT");
        nft = await NFT.connect(owner).deploy(merkleTree.getHexRoot());
        await nft.deployed();
    });


    // ------------------------------------------
    // ----------   OWNER WITHDRAW  -------------
    // ------------------------------------------

    it("Permission withdraw", async () => {
        const userBuyer = simpleUsers[0];
        const userWidthdraw = simpleUsers[1];

        const initialBalance = await ethers.provider.getBalance(owner.address);

        const price = await nft.PRICE_PRESALE();

        try {
            await nft.connect(userBuyer).mint({ value: price });
            await nft.connect(userWidthdraw).withdraw();
        } catch (e) { debugLog(e); } finally {
            expect(await ethers.provider.getBalance(owner.address)).to.lte(initialBalance);
        }
    });

    it("Owner withdraw", async () => {
        const userBuyer = simpleUsers[0];
        const initialBalance = await ethers.provider.getBalance(owner.address);

        try {
            await nft.connect(userBuyer).mint({ value: await nft.PRICE_PRESALE() });
            await nft.connect(owner).withdraw();
        } catch (e) { debugLog(e); } finally {
            expect(await ethers.provider.getBalance(owner.address)).to.gt(initialBalance);
        }
    });

    it("Double withdraw", async () => {
        const userBuyer = simpleUsers[0];
        let balance;

        try {
            await nft.connect(userBuyer).mint({ value: await nft.PRICE_PRESALE() });

            await nft.connect(owner).withdraw();
            balance = await ethers.provider.getBalance(owner.address);
            await nft.connect(owner).withdraw();

        } catch (e) { debugLog(e); } finally {
            expect(await ethers.provider.getBalance(owner.address)).to.lte(balance);
        }
    });

    // ------------------------------------------
    // ----------   PUBLIC SALE  ----------------
    // ------------------------------------------

    it("Public sale signle", async () => {
        await endPresale();

        const user = simpleUsers[0];
        const price = await nft.PRICE_PUBLIC();
        try {
            await nft.connect(user).mint({ value: price });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(1);
        }
    });

    it("Public sale recieve", async () => {
        await endPresale();

        const user = simpleUsers[0];
        const price = await nft.PRICE_PUBLIC();
        try {
            await user.sendTransaction({
                to: nft.address,
                value: price
            });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(1);
        }
    });

    it("Public sale not enough funds", async () => {
        await endPresale();

        const user = simpleUsers[0];
        const price = await nft.PRICE_PUBLIC();
        try {
            await nft.connect(user).mint({ value: price.sub(1) });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(0);
        }
    });

    it("Public sale multi sale limit", async () => {
        await endPresale();

        const user = simpleUsers[0];
        const limit = await nft.MAX_MINT_ONE_TIME();
        const price = await nft.PRICE_PUBLIC();

        try {
            await nft.connect(user).mint({ value: price.mul(limit.add(1)) });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(limit);
        }
    });

    it("Public sale send change", async () => {
        await endPresale();

        const user = simpleUsers[0];
        const price = await nft.PRICE_PUBLIC();
        const payment = price.add(price.sub(1));
        const testBalance = (await ethers.provider.getBalance(user.address)).sub(payment);

        try {
            await nft.connect(user).mint({ value: payment });
        } catch (e) { debugLog(e); } finally {
            expect(await ethers.provider.getBalance(user.address)).to.gt(testBalance);
        }
    });

    // ------------------------------------------
    // ------------   PRESALE  ------------------
    // ------------------------------------------

    it("Presale signle", async () => {
        const user = simpleUsers[0];
        const price = await nft.PRICE_PRESALE();
        try {
            await nft.connect(user).mint({ value: price });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(1);
        }
    });

    it("Presale recieve", async () => {
        const user = simpleUsers[0];
        const price = await nft.PRICE_PRESALE();
        try {
            await user.sendTransaction({
                to: nft.address,
                value: price
            });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(1);
        }
    });

    it("Presale not enough funds", async () => {
        const user = simpleUsers[0];
        const price = await nft.PRICE_PRESALE();
        try {
            await nft.connect(user).mint({ value: price.sub(1) });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(0);
        }
    });

    it("Presale tokens limit", async () => {
        const user = simpleUsers[0];
        const limit = await nft.MAX_PRESALE_HOLDER_SUPPLY();
        const price = await nft.PRICE_PRESALE();
        try {
            for (let i = 0; limit.add(1).gt(i); i++) {
                await nft.connect(user).mint({ value: price });
            }
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(limit);
        }
    });

    it("Presale holders limit", async () => {
        const users = simpleUsers;
        const limit = await nft.reservedHoldersCountForPresale();
        const price = await nft.PRICE_PRESALE();
        let holdersCount = 0;

        const moreLimit = limit.add(1);
        expect(users.length).gte(moreLimit); // This is not contract error, this test error

        try {
            for (let i = 0; moreLimit.gt(i); i++) {
                await nft.connect(users[i]).mint({ value: price });
                holdersCount++;
            }
        } catch (e) { debugLog(e); } finally {
            expect(holdersCount).to.eq(limit);
        }
    });

    it("Presale multi sale limit", async () => {
        const user = simpleUsers[0];
        const limit = await nft.MAX_PRESALE_HOLDER_SUPPLY();
        const price = await nft.PRICE_PRESALE();

        try {
            await nft.connect(user).mint({ value: price.mul(limit.add(1)) });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(limit);
        }
    });

    it("Presale buy after presale", async () => {
        await endPresale();

        const user = simpleUsers[0];
        const price = await nft.PRICE_PRESALE();
        try {
            await nft.connect(user).mint({ value: price });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(0);
        }
    });

    it("Presale send change", async () => {
        const user = simpleUsers[0];
        const price = await nft.PRICE_PRESALE();
        const payment = price.add(price.sub(1));
        const testBalance = (await ethers.provider.getBalance(user.address)).sub(payment);

        try {
            await nft.connect(user).mint({ value: payment });
        } catch (e) { debugLog(e); } finally {
            expect(await ethers.provider.getBalance(user.address)).to.gt(testBalance);
        }
    });

    // ------------------------------------------
    // ------------   AIRDROP  ------------------
    // ------------------------------------------

    it("AirDrop forbidden", async () => {
        const user = simpleUsers[0];
        try {
            await nft.connect(user).claimAirDrop(getAirDropProof(merkleTree, user.address));
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(0);
        }
    });

    it("AirDrop claim", async () => {
        await airDropClaim();
    });
    async function airDropClaim() {
        try {
            for (let user of airDropUsers) {
                await nft.connect(user).claimAirDrop(getAirDropProof(merkleTree, user.address));
            }
        } catch (e) { debugLog(e); } finally {
            for (let user of airDropUsers) {
                expect(await nft.balanceOf(user.address)).to.eq(1);
            }
        }
    }

    it("AirDrop double claim", async () => {
        const user = airDropUsers[0];
        try {
            for (let i = 0; i < 2; i++) {
                await nft.connect(user).claimAirDrop(getAirDropProof(merkleTree, user.address));
            }
        } catch (e) { debugLog(e); } finally {
            expect(await nft.balanceOf(user.address)).to.eq(1);
        }
    });

    // !!! WARNING: SLOW TEST (5k+ iterations)
    // !!! WARNING: Contains two test in one
    it("AirDrop reserved & Supply limit", async () => {
        await endPresale();

        const user = simpleUsers[0];
        const supplyLimit = await nft.SUPPLY_LIMIT();

        try {
            for (let i = 0; supplyLimit.gt(i); i++) {
                await nft.connect(user).mint({ value: await nft.PRICE_PUBLIC() });
            }
        } catch (e) { debugLog(e); } finally {
            const tokensCount = await nft.tokensCount();
            const reservedTokenForAirDrop = await nft.reservedTokenForAirDrop();
            expect(tokensCount).to.eq(supplyLimit.sub(reservedTokenForAirDrop));
        }

        await airDropClaim();

        // !!! Other test, [OPTIMIZATION] : TEST SUPPLY LIMIT
        try {
            await nft.connect(user).mint({ value: await nft.PRICE_PUBLIC() });
        } catch (e) { debugLog(e); } finally {
            expect(await nft.tokensCount()).to.eq(supplyLimit);
        }
    });

    // ------------------------------------------
    // ------------   HELPERS  ------------------
    // ------------------------------------------

    async function endPresale() {
        await network.provider.send("evm_increaseTime", [(await nft.PRESALE_TIMEOUT()).add(1).toNumber()]);
        await network.provider.send("evm_mine");
    }

    function debugLog(e) {
        if (DEBUG_LOGS) console.log(e);
    }
});