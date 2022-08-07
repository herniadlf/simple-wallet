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
                value: ethers.utils.parseEther('0.1')
            });

            const contractBalance = await ethersProvider.getBalance(simpleWalletDeployed.address);
            expect(ethers.utils.formatEther(contractBalance)).to.equal('0.1');
            await expect(tx)
                .to.emit(simpleWalletDeployed, 'FundsReceived')
                .withArgs(externalAccount.address, ethers.utils.parseEther('0.1'));
        });
    });

    describe('Allowance', function() {
        it('should set one address allowed to withdraw unlimited funds', async function() {
            [owner, allowedAccount] = await ethers.getSigners();
            
            const tx = await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 0, 0, 0);

            await expect(tx)
                .to.emit(simpleWalletDeployed, 'NewAccountAllowed')
                .withArgs(allowedAccount.address, 0, 0, 0);
            expect(await simpleWalletDeployed.isAllowed(allowedAccount.address))
                .to.equal(true);
        });

        it('should set one address allowed to withdraw once by day unlimited funds', async function() {
            [owner, allowedAccount] = await ethers.getSigners();
            
            const tx = await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 1, 1, 0);

            await expect(tx)
                .to.emit(simpleWalletDeployed, 'NewAccountAllowed')
                .withArgs(allowedAccount.address, 1, 1, 0);
            expect(await simpleWalletDeployed.isAllowed(allowedAccount.address))
                .to.equal(true);
        });

        it('should set one address allowed to withdraw twice by month unlimited funds', async function() {
            [owner, allowedAccount] = await ethers.getSigners();
            
            const tx = await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 2, 2, 0);

            await expect(tx)
                .to.emit(simpleWalletDeployed, 'NewAccountAllowed')
                .withArgs(allowedAccount.address, 2, 2, 0);
            expect(await simpleWalletDeployed.isAllowed(allowedAccount.address))
                .to.equal(true);
        });

        it('should set one address allowed to withdraw twice by year unlimited funds', async function() {
            [owner, allowedAccount] = await ethers.getSigners();
            
            const tx = await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 2, 3, 0);

            await expect(tx)
                .to.emit(simpleWalletDeployed, 'NewAccountAllowed')
                .withArgs(allowedAccount.address, 2, 3, 0);
            expect(await simpleWalletDeployed.isAllowed(allowedAccount.address))
                .to.equal(true);
        });

        it('should set one address allowed to withdraw twice by year with cap 0.1eth', async function() {
            [owner, allowedAccount] = await ethers.getSigners();
            const cap = ethers.utils.parseEther('0.1')
            const tx = await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 2, 3, cap);

            await expect(tx)
                .to.emit(simpleWalletDeployed, 'NewAccountAllowed')
                .withArgs(allowedAccount.address, 2, 3, cap);
            expect(await simpleWalletDeployed.isAllowed(allowedAccount.address))
                .to.equal(true);
        });

        it('should fail if unit time is wrong', async function() {
            [owner, allowedAccount] = await ethers.getSigners();
            const cap = ethers.utils.parseEther('0.1')
            const tx = simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 2, 4, cap);
            const messageExpected = 'The withdrawal unit time must be 0(unlimited), 1(daily), 2(monthly) or 3(yearly).';
            await expect(tx).to.be.revertedWith(messageExpected);
        });

        it('should fail if quantity is set without unit time', async function() {
            [owner, allowedAccount] = await ethers.getSigners();
            const cap = ethers.utils.parseEther('0.1')
            const tx = simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 2, 0, cap);
            const messageExpected = 'The withdrawal unit time and quantity must be both unlimited or both defined';
            await expect(tx).to.be.revertedWith(messageExpected);
        });

        it('should fail if unit time is set without quantity', async function() {
            [owner, allowedAccount] = await ethers.getSigners();
            const cap = ethers.utils.parseEther('0.1')
            const tx = simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 0, 2, cap);
            const messageExpected = 'The withdrawal unit time and quantity must be both unlimited or both defined';
            await expect(tx).to.be.revertedWith(messageExpected);
        });

        it('should fail if an external account try to set one address as allowed', async function() {
            [owner, externaAccount, allowedAccount] = await ethers.getSigners();
            
            const tx = simpleWalletDeployed
                                .connect(externaAccount)
                                .addAllowedAccount(allowedAccount.address, 0, 0, 0);
    
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
            funds = ethers.utils.parseEther('0.1');
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
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 0, 0, 0);
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
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 0, 0, 0);
            const fundsToWithdraw = ethers.utils.parseEther('0.2');
            const tx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);

            await expect(tx).to.be.revertedWith('There are no sufficient funds');
        });

        it('should fail because the withdrawal amount has exceed allowed cap', async function() {
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 0, 0, ethers.utils.parseEther('0.005'));
            const fundsToWithdraw = ethers.utils.parseEther('0.1');
            const tx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);

            await expect(tx).to.be.revertedWith('Withdrawal amount exceed the allowed cap');
        });

        it('should fail because the withdrawal quantity has reach the limit', async function() {
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 1, 1, ethers.utils.parseEther('0.1'));
            const fundsToWithdraw = ethers.utils.parseEther('0.05');
            await simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            const secondTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);

            await expect(secondTx).to.be.revertedWith('Invalid withdrawal rules');
        });

        it('should withdraw a second time if one day has pass', async function() {
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 1, 1, ethers.utils.parseEther('0.1'));
            const fundsToWithdraw = ethers.utils.parseEther('0.05');
            const firstTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(firstTx)
                .to.emit(simpleWalletDeployed, 'Withdrawal')
                .withArgs(allowedAccount.address, fundsToWithdraw);
            
            const secondTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(secondTx).to.be.revertedWith('Invalid withdrawal rules');
            // Pass one day..    
            const oneDay = 60*60*24;
            await ethers.provider.send('evm_increaseTime', [oneDay]);
            await ethers.provider.send('evm_mine');
            // And try again
            const thirdTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(thirdTx)
                .to.emit(simpleWalletDeployed, 'Withdrawal')
                .withArgs(allowedAccount.address, fundsToWithdraw);
        });

        it('should withdraw a second time if one month has pass', async function() {
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 1, 2, ethers.utils.parseEther('0.1'));
            const fundsToWithdraw = ethers.utils.parseEther('0.05');
            const firstTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(firstTx)
                .to.emit(simpleWalletDeployed, 'Withdrawal')
                .withArgs(allowedAccount.address, fundsToWithdraw);
            
            const secondTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(secondTx).to.be.revertedWith('Invalid withdrawal rules');
            // Pass one day..    
            const oneDay = 60*60*24;
            await ethers.provider.send('evm_increaseTime', [oneDay]);
            await ethers.provider.send('evm_mine');
            // And try again
            const thirdTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(thirdTx).to.be.revertedWith('Invalid withdrawal rules');
            // Now pass one month
            const oneMonth = 4*7*60*60*24;
            await ethers.provider.send('evm_increaseTime', [oneMonth]);
            await ethers.provider.send('evm_mine');
            const forthTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(forthTx)
                .to.emit(simpleWalletDeployed, 'Withdrawal')
                .withArgs(allowedAccount.address, fundsToWithdraw);
        });

        it('should withdraw a second time if one year has pass', async function() {
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 1, 2, ethers.utils.parseEther('0.1'));
            const fundsToWithdraw = ethers.utils.parseEther('0.05');
            const firstTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(firstTx)
                .to.emit(simpleWalletDeployed, 'Withdrawal')
                .withArgs(allowedAccount.address, fundsToWithdraw);
            
            const secondTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(secondTx).to.be.revertedWith('Invalid withdrawal rules');
            // Pass one year..    
            const oneYear = 12*4*7*60*60*24;
            await ethers.provider.send('evm_increaseTime', [oneYear]);
            await ethers.provider.send('evm_mine');
            // And try again
            const thirdTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(thirdTx)
                .to.emit(simpleWalletDeployed, 'Withdrawal')
                .withArgs(allowedAccount.address, fundsToWithdraw);
        });

        it('should withdraw a second time if one day has pass and then fail again', async function() {
            await simpleWalletDeployed.addAllowedAccount(allowedAccount.address, 1, 1, ethers.utils.parseEther('0.1'));
            const fundsToWithdraw = ethers.utils.parseEther('0.01');
            const firstTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(firstTx)
                .to.emit(simpleWalletDeployed, 'Withdrawal')
                .withArgs(allowedAccount.address, fundsToWithdraw);
            
            // Pass one day..    
            const oneDay = 60*60*24;
            await ethers.provider.send('evm_increaseTime', [oneDay]);
            await ethers.provider.send('evm_mine');
            const secondTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(secondTx)
            .to.emit(simpleWalletDeployed, 'Withdrawal')
            .withArgs(allowedAccount.address, fundsToWithdraw);
            
            const thirdTx = simpleWalletDeployed.connect(allowedAccount).withdrawFunds(fundsToWithdraw);
            await expect(thirdTx).to.be.revertedWith('Invalid withdrawal rules');
        });
      
    });

});
