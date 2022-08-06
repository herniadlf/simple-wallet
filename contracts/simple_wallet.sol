//SPDX-License-Identifier: UNLICENSED
/**
 * @author: [@herniadlf]
 *  @reviewers: []
 *  @auditors: []
 *  @bounties: []
 *  @deployments: []
 *  @tools: []
 */

pragma solidity ^0.8.9;
import '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title SimpleWallet
 * This wallet allows the owner to set-up a list of address that can withdraw funds 
 * with certain budget in certain period of times.
 */
contract SimpleWallet is Ownable {

    /* Structs */

    enum UNIT_TIME {UNLIMITED, DAILY, MONTHLY, YEARLY}

    struct AllowedAccount {
        uint withdrawalCap; // The maximum amount that can be withdrawed in each operation. 0 means unlimited.   
        uint withdrawalUnitTimeMultiplier; // The unit time multiplier (1 day, 1 month or 1 year). 
        uint withdrawalQuantity; // The amount of withdrawal operations that can be performed per unit time. 0 means unlimited.
        uint withdrawalCooldown; // The last withdrawal time. Used to calculate withdrawal rules.
        uint withdrawalCount; // Count the withdrawal operations. Used to calculate withdrawal rules. 
    }

    /* Storage */

    mapping(address => AllowedAccount) public allowedAccounts; // Map the account with allowance data.
    mapping(address => bool) private allowedAccountValid; // Helper to check if some account is allowed or not.

    /* Events */

    /**
     * @dev Emitted when this contract receives funds.
     * @param _sender The address that sends funds to the contract.
     * @param _amount The amount that _sender sends to the contract.
     */
    event FundsReceived(address indexed _sender, uint _amount);

    /**
     * @dev Emitted when a new address is declared for withdrawing funds from the contract.
     */
    event NewAccountAllowed(address indexed _allowedAccount, 
                            uint _withdrawalUnitTime,
                            uint _withdrawalQuantity, 
                            uint _withdrawalCap);

    /**
     * @dev Emitted when an allowed account withdraw funds from the contract.
     * @param _destination The allowed account that withdraw the funds.
     * @param _amount The amount of funds that the allowed account has withdrawn.
     */
    event Withdrawal(address indexed _destination, uint _amount);

    /* Modifiers */

    modifier onlyAllowed() {
        require(isAllowed(msg.sender), 'You are not allowed to withdraw funds');
        _;
    }
    
    /* External and public */

    /**
     * @dev Fallback function that allow this contract to receive ether.
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    /**
     * @dev Add a new account the allowance to withdraw funds.
     * @param _allowedAccount The new address that is allowed to withdraw funds.
     * @param _withdrawalQuantity The withdrawal quantity allowed for the _allowedAccount in a certain period. 0 for unlimited.
     * @param _withdrawalUnitTime The unit time of withdrawal. 0: unlimited, 1: by day, 2: by month, 3: by year.
     * @param _withdrawalCap The max amount of funds that can be withdraw each time. 0 for unlimited.
     */
    function addAllowedAccount(address _allowedAccount,
                                uint _withdrawalQuantity, 
                                uint _withdrawalUnitTime,
                                uint _withdrawalCap) onlyOwner public {
        require(_withdrawalUnitTime <= 3, 'The withdrawal unit time must be 0(unlimited), 1(daily), 2(monthly) or 3(yearly).');
        require((_withdrawalUnitTime == 0 && _withdrawalQuantity == 0) || 
                (_withdrawalUnitTime > 0 && _withdrawalQuantity > 0), 
                'The withdrawal unit time and quantity must be both unlimited or both defined');
        uint multiplier;
        if (_withdrawalUnitTime == 1) {
            multiplier = 1 days;
        } else if (_withdrawalUnitTime == 2) {
            multiplier = 4 weeks;
        } else if (_withdrawalUnitTime == 3) {
            multiplier = 48 weeks;
        }
        allowedAccounts[_allowedAccount] = AllowedAccount(_withdrawalCap, multiplier, _withdrawalQuantity, 0, 0);
        allowedAccountValid[_allowedAccount] = true;
        emit NewAccountAllowed(_allowedAccount, _withdrawalQuantity, _withdrawalUnitTime, _withdrawalCap);
    }

    /**
     * @dev Check if an accounts is allowed to withdraw funds from the contract.
     * @param _address The address to check if its allowed to withdraw funds from the contract.
     */
    function isAllowed(address _address) public view returns (bool) {
        return allowedAccountValid[_address];
    }

    /**
     * @dev Let an allowed account to withdraw funds.
     * @param _amountToWithdraw The amount to withdraw from the wallet.
     */
    function withdrawFunds(uint _amountToWithdraw) onlyAllowed public payable {
        require(address(this).balance >= _amountToWithdraw, 'There are no sufficient funds');
        AllowedAccount storage allowedAccount = allowedAccounts[msg.sender];
        require(allowedAccount.withdrawalCap == 0 || allowedAccount.withdrawalCap >= _amountToWithdraw, 'Withdrawal amount exceed the allowed cap');
        require(allowedAccount.withdrawalQuantity == 0 || 
                    allowedAccount.withdrawalCount < allowedAccount.withdrawalQuantity ||
                    block.timestamp > allowedAccount.withdrawalCooldown, 'Invalid withdrawal rules');
        if (allowedAccount.withdrawalQuantity > 0 && allowedAccount.withdrawalQuantity == allowedAccount.withdrawalCount) {
            allowedAccount.withdrawalCooldown = block.timestamp + allowedAccount.withdrawalUnitTimeMultiplier;
            allowedAccount.withdrawalCount = 1;
        }

        payable(msg.sender).transfer(_amountToWithdraw);
        emit Withdrawal(msg.sender, _amountToWithdraw);
    }

}