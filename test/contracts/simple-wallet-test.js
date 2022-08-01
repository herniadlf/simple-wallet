const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('SimpleWallet Contract', function () {
    
    let simpleWalletContract;
    let simpleWalletDeployed;
    let ethersProvider;

    beforeEach(async function () {
        simpleWalletContract = await ethers.getContractFactory('SimpleWallet');
        simpleWalletDeployed = await simpleWalletContract.deploy();
        ethersProvider = ethers.provider;

        await simpleWalletDeployed.deployed();
    });

    describe('Deployment', function() {
        it('owner should be the deployer', async function() {
            [expectedOwner] = await ethers.getSigners();
            expect(await simpleWalletDeployed.owner()).to.equal(expectedOwner.address);
        });
    });

    describe('Fund wallet', function() {
        it('should receive funds from an external account', async function() {
            [owner, externalAccount] = await ethers.getSigners();

            const tx = await externalAccount.sendTransaction({
                to: simpleWalletDeployed.address,
                value: ethers.utils.parseEther("0.1")
            });

            const contractBalance = await ethersProvider.getBalance(simpleWalletDeployed.address);
            expect(ethers.utils.formatEther(contractBalance)).to.equal('0.1');
            await expect(tx)
                .to.emit(simpleWalletDeployed, 'FundsReceived')
                .withArgs(externalAccount.address, ethers.utils.parseEther("0.1"));
        });
    });

    describe('Allowance', function() {
        it('should set one address allowed to withdraw funds', async function() {
            [owner, allowedAccount] = await ethers.getSigners();
            
            const tx = await simpleWalletDeployed.addAllowedAccount(allowedAccount.address);

            await expect(tx)
                .to.emit(simpleWalletDeployed, 'NewAccountAllowed')
                .withArgs(allowedAccount.address);
            expect(await simpleWalletDeployed.isAllowed(allowedAccount.address))
                .to.equal(true);
        });

        it('should fail if an external account try to set one address as allowed', async function() {
            [owner, externaAccount, allowedAccount] = await ethers.getSigners();
            
            const tx = simpleWalletDeployed
                                .connect(externaAccount)
                                .addAllowedAccount(allowedAccount.address);

            await expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
        });

        it('should not be an allowed account by default', async function() {
            [owner, notAllowedAccount] = await ethers.getSigners();
            
            expect(await simpleWalletDeployed.isAllowed(notAllowedAccount.address))
                .to.equal(false);
        });
    });

    describe('Withdrawal', function() {
        
        let owner;
        let allowedAccount;
        let notAllowedAccount;
        let funds;

        beforeEach(async function() {
            [owner, allowedAccount, notAllowedAccount] = await ethers.getSigners();
            funds = ethers.utils.parseEther("0.1");
            await allowedAccount.sendTransaction({
                to: simpleWalletDeployed.address,
                value: funds
            });
        });

        it('should fail withdraw because it\'s not an allowed account', async function() {
            const tx = simpleWalletDeployed
                                .connect(notAllowedAccount)
                                .withdrawFunds(funds);
            await expect(tx).to.be.revertedWith('You are not allowed to withdraw funds');
        });

        it('should withdraw all the funds', async function() {
            const allowedAccountInitialBalance = await ethersProvider.getBalance(allowedAccount.address);
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address);
            const tx = await simpleWalletDeployed.connect(allowedAccount).withdrawFunds(funds);

            await expect(tx)
                .to.emit(simpleWalletDeployed, 'Withdrawal')
                .withArgs(allowedAccount.address, funds);
            const contractBalance = await ethersProvider.getBalance(simpleWalletDeployed.address);
            expect(contractBalance).to.equal(ethers.constants.Zero);
            const allowedAccountFinalBalance = await ethersProvider.getBalance(allowedAccount.address);
            expect(allowedAccountFinalBalance > allowedAccountInitialBalance).to.equal(true);
        });

        it('should fail because the wallet has no sufficient funds', async function() {
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address);
            const fundsToWithdraw = ethers.utils.parseEther("0.2");
            const tx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);

            await expect(tx).to.be.revertedWith('There are no sufficient funds');
        });
      
    });

});
