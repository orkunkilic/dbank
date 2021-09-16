// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./Token.sol";

contract dBank {

  Token private token;

  mapping(address => uint) public etherBalanceOf;
  mapping(address => uint) public depositStart;
  mapping(address => bool) public isDeposited;
  mapping(address => bool) public isBorrowed;
  mapping(address => uint) public etherCollateral;

  event Deposit(address indexed user, uint etherAmount, uint timeStart);
  event Withdraw(address indexed user, uint etherAmount, uint depositTime, uint interest);
  event Borrow(address indexed user, uint collateralEtherAmount, uint borrowedTokenAmount);
  event PayOff(address indexed user, uint fee);

  constructor(Token _token) public {
    token = _token;
  }

  function deposit() payable public {
    require(isDeposited[msg.sender] == false, "Error, deposit already active");
    require(msg.value >= 1e16, "Error, deposit must be >= 0.1 ETH");
    
    etherBalanceOf[msg.sender] = etherBalanceOf[msg.sender] + msg.value;
    depositStart[msg.sender] = depositStart[msg.sender] + block.timestamp;
    isDeposited[msg.sender] = true;

    emit Deposit(msg.sender, msg.value, block.timestamp);
  }

  function getEthereumBalanceOf() public view returns(uint) {
    uint etherBalance =  etherBalanceOf[msg.sender];

    return etherBalance;
  }

  function getInterest() public view returns(uint) {
    require(isDeposited[msg.sender] == true, "Error, no previous deposit");

    uint userBalance = etherBalanceOf[msg.sender];
    uint depositTime = block.timestamp - depositStart[msg.sender];

    uint interestPerSecond = 31668017 * (userBalance / 1e16);
    uint interest = interestPerSecond * depositTime;

    return interest;
  }

  function withdraw() public {
    require(isDeposited[msg.sender] == true, "Error, no previous deposit");
    
    uint userBalance = etherBalanceOf[msg.sender];
    uint depositTime = block.timestamp - depositStart[msg.sender];

    uint interestPerSecond = 31668017 * (userBalance / 1e16);
    uint interest = interestPerSecond * depositTime;

    msg.sender.transfer(userBalance);
    token.mint(msg.sender, interest);

    etherBalanceOf[msg.sender] = 0;
    depositStart[msg.sender] = 0;
    isDeposited[msg.sender] = false;

    emit Withdraw(msg.sender, userBalance, depositTime, interest);
  }

  function borrow() payable public {
    require(msg.value >= 1e16, "Error, deposit must be >= 0.1 ETH");
    require(isBorrowed[msg.sender] == false, "Error, user has an active loan!");

    etherCollateral[msg.sender] = etherCollateral[msg.sender] + msg.value;
    uint tokenAmountToMint = msg.value / 2;
    token.mint(msg.sender, tokenAmountToMint);

    isBorrowed[msg.sender] = true;

    emit Borrow(msg.sender, etherCollateral[msg.sender], tokenAmountToMint);
  }

  function payOff() public {
    require(isBorrowed[msg.sender] == true, "Error, user does not have an active loan!");
    require(token.transferFrom(msg.sender, address(this), etherCollateral[msg.sender] / 2), "Error, can't receive tokens.");

    uint fee = etherCollateral[msg.sender] / 10;
    msg.sender.transfer(etherCollateral[msg.sender] - fee);

    etherCollateral[msg.sender] = 0;
    isBorrowed[msg.sender] = false;

    emit PayOff(msg.sender, fee);
  }
}