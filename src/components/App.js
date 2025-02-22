import { Tabs, Tab } from 'react-bootstrap';
import dBank from '../abis/dBank.json';
import React, { Component } from 'react';
import Token from '../abis/Token.json';
import dbank from '../dbank.png';
import Web3 from 'web3';
import './App.css';

//h0m3w0rk - add new tab to check accrued interest

class App extends Component {
  async componentWillMount() {
    await this.loadBlockchainData(this.props.dispatch);
  }

  async loadBlockchainData(dispatch) {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum);
      const netId = await web3.eth.net.getId();
      const accounts = await web3.eth.getAccounts();

      if (typeof accounts[0] !== 'undefined') {
        const balance = await web3.eth.getBalance(accounts[0]);
        this.setState({ account: accounts[0], balance, web3 });
      } else window.alert('Please login with Metamask!');

      try {
        const token = new web3.eth.Contract(
          Token.abi,
          Token.networks[netId].address
        );
        const dbank = new web3.eth.Contract(
          dBank.abi,
          dBank.networks[netId].address
        );
        const dBankAddress = dBank.networks[netId].address;
        this.setState({ token, dbank, dBankAddress });
      } catch (e) {
        console.log('Error', e);
        window.alert('Contracts not deployed to the current network!');
      }
    } else window.alert('Please install Metamask!');
  }

  async deposit(amount) {
    if (this.state.dbank !== 'undefined') {
      try {
        await this.state.dbank.methods
          .deposit()
          .send({ value: amount.toString(), from: this.state.account });
      } catch (e) {
        console.log('Error, deposit: ', e);
      }
    }
  }

  async withdraw(e) {
    e.preventDefault();
    if (this.state.dbank !== 'undefined') {
      try {
        await this.state.dbank.methods
          .withdraw()
          .send({ from: this.state.account });
      } catch (e) {
        console.log('Error, withdraw: ', e);
      }
    }
  }

  async borrow(amount) {
    if (this.state.dbank !== 'undefined') {
      try {
        await this.state.dbank.methods
          .borrow()
          .send({ value: amount.toString(), from: this.state.account });
      } catch (e) {
        console.log('Error, borrow: ', e);
      }
    }
  }

  async payOff(e) {
    e.preventDefault();
    if (this.state.dbank !== 'undefined') {
      try {
        const collateralEther = await this.state.dbank.methods
          .etherCollateral(this.state.account)
          .call({ from: this.state.account });
        const tokenBorrowed = collateralEther / 2;
        await this.state.token.methods
          .approve(this.state.dBankAddress, tokenBorrowed.toString())
          .send({ from: this.state.account });
        await this.state.dbank.methods
          .payOff()
          .send({ from: this.state.account });
      } catch (e) {
        console.log('Error, pay off: ', e);
      }
    }
  }

  async checkDBC() {
    if (this.state.dbank !== 'undefined') {
      try {
        let DBC = await this.state.token.methods
          .balanceOf(this.state.account)
          .call();
        DBC = await this.state.web3.utils.fromWei(DBC);
        this.setState({ DBC });
      } catch (e) {
        console.log('Error, get interest: ', e);
      }
    }
  }

  async getBalanceInDBank() {
    if (this.state.dbank !== 'undefined') {
      try {
        let balanceInDBank = await this.state.dbank.methods
          .getEthereumBalanceOf()
          .call({ from: this.state.account });
        balanceInDBank = await this.state.web3.utils.fromWei(balanceInDBank);
        this.setState({ balanceInDBank });
      } catch (e) {
        console.log('Error, get deposited amount: ', e);
      }
    }
  }
  constructor(props) {
    super(props);
    this.state = {
      web3: 'undefined',
      account: '',
      token: null,
      dbank: null,
      balance: 0,
      balanceInDBank: null,
      interest: null,
      DBC: null,
      dBankAddress: null,
    };
  }

  render() {
    return (
      <div className="text-monospace">
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
          <a
            className="navbar-brand col-sm-3 col-md-2 mr-0"
            href="http://www.dappuniversity.com/bootcamp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={dbank} className="App-logo" alt="logo" height="32" />
            <b>dBank</b>
          </a>
        </nav>
        <div className="container-fluid mt-5 text-center">
          <br></br>
          <h1>Welcome to dBank</h1>
          <h2>{this.state.account}</h2>
          <br></br>
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">
                <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example">
                  <Tab eventKey="deposit" title="Deposit">
                    <div>
                      <br />
                      How much do you want to deposit?
                      <br />
                      (min. amount is 0.01 ETH)
                      <br />
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          let amount = this.depositAmount.value;
                          amount = amount * 10 ** 18;
                          this.deposit(amount);
                        }}
                      >
                        <div className="form-group mr-sm-2">
                          <br />
                          <input
                            id="depositAmount"
                            step="0.01"
                            type="number"
                            className="form-control form-control-md"
                            placeholder="amount..."
                            required
                            ref={(input) => (this.depositAmount = input)}
                          />
                        </div>
                        <button type="submit" className="btn btn-primary">
                          DEPOSIT
                        </button>
                      </form>
                    </div>
                  </Tab>
                  <Tab eventKey="withdraw" title="Withdraw">
                    <br />
                    Do you want to withdraw + take interest?
                    <br />
                    <div>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={(e) => this.withdraw(e)}
                      >
                        WITHDRAW
                      </button>
                    </div>
                  </Tab>
                  <Tab eventKey="borrow" title="Borrow">
                    <div>
                      <br></br>
                      Do you want to borrow tokens?
                      <br></br>
                      (You'll get 50% of collateral, in Tokens)
                      <br></br>
                      Type collateral amount (in ETH)
                      <br></br>
                      <br></br>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          let amount = this.borrowAmount.value;
                          amount = amount * 10 ** 18;
                          this.borrow(amount);
                        }}
                      >
                        <div className="form-group mr-sm-2">
                          <input
                            id="borrowAmount"
                            step="0.01"
                            type="number"
                            ref={(input) => {
                              this.borrowAmount = input;
                            }}
                            className="form-control form-control-md"
                            placeholder="amount..."
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-primary">
                          BORROW
                        </button>
                      </form>
                    </div>
                  </Tab>
                  <Tab eventKey="payOff" title="Payoff">
                    <div>
                      <br></br>
                      Do you want to payoff the loan?
                      <br></br>
                      (You'll receive your collateral - fee)
                      <br></br>
                      <br></br>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={(e) => this.payOff(e)}
                      >
                        PAYOFF
                      </button>
                    </div>
                  </Tab>
                  <Tab eventKey="checkInterest" title="Check DBC">
                    <br />
                    Current DBC
                    <br />
                    <div>
                      <button
                        className="btn btn-primary"
                        onClick={() => this.checkDBC()}
                      >
                        GET
                      </button>
                    </div>
                    {this.state.DBC ? this.state.DBC + ' DBC' : ''}
                  </Tab>
                  <Tab eventKey="balanceInDBank" title="Check Balance In dBank">
                    <br />
                    Current Balance in dBank
                    <br />
                    <div>
                      <button
                        className="btn btn-primary"
                        onClick={() => this.getBalanceInDBank()}
                      >
                        GET
                      </button>
                    </div>
                    {this.state.balanceInDBank
                      ? this.state.balanceInDBank + ' ETH'
                      : ''}
                  </Tab>
                </Tabs>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
