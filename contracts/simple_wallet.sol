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
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleWallet
 * This wallet allows the owner to set-up a list of address that can withdraw funds 
 * with certain budget in certain period of times.
 */
contract SimpleWallet is Ownable {

    /* Events */

    /**
     * @dev Emitted when this contract receives funds.
     * @param _sender The address that sends funds to the contract.
     * @param _amount The amount that _sender sends to the contract.
     */
    event FundsReceived(address indexed _sender, uint _amount);

    /**
     * @dev Emitted when a new address is declared for withdrawing funds from the contract.
     * @param _allowedAccount The new address that is allowed to withdraw funds.
     */
    event NewAccountAllowed(address indexed _allowedAccount);

    /**
     * @dev Emitted when an allowed account withdraw funds from the contract.
     * @param _destination The allowed account that withdraw the funds.
     * @param _amount The amount of funds that the allowed account has withdrawn.
     */
    event Withdrawal(address indexed _destination, uint _amount);

    /* Structs */

    /* Storage */

    mapping(address => bool) private allowedAccounts;
    
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
     */
    function addAllowedAccount(address _allowedAccount) onlyOwner public {
        allowedAccounts[_allowedAccount] = true;
        emit NewAccountAllowed(_allowedAccount);
    }

    /**
     * @dev Check if an accounts is allowed to withdraw funds from the contract.
     * @param _address The address to check if its allowed to withdraw funds from the contract.
     */
    function isAllowed(address _address) public view returns (bool) {
        return allowedAccounts[_address];
    }

    /**
     * @dev
     */
    function withdrawFunds(uint _amountToWithdraw) public payable {
        require(isAllowed(msg.sender), "You are not allowed to withdraw funds");
        require(address(this).balance >= _amountToWithdraw, "There are no sufficient funds");

        payable(msg.sender).transfer(_amountToWithdraw);
        emit Withdrawal(msg.sender, _amountToWithdraw);
    }

}