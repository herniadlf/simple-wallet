const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('SimpleWallet Contract', function () {
    
    let simpleWalletContract;
    let simpleWalletDeployed;

    beforeEach(async function () {
        simpleWalletContract = await ethers.getContractFactory('SimpleWallet');
        simpleWalletDeployed = await simpleWalletContract.deploy();

        await simpleWalletDeployed.deployed();
    });

    describe('Deployment', function() {
        it('owner should be the deployer', async function() {
            [expectedOwner] = await ethers.getSigners();
            expect(await simpleWalletDeployed.owner()).to.equal(expectedOwner.address);
        });
    });
});
