import { useState, useEffect } from "react";
import { ethers } from "ethers";

const { BrowserProvider, JsonRpcProvider, Contract, parseEther, formatEther } =
  ethers;

function App() {
  const [account, setAccount] = useState("");
  const [collateralBalance, setCollateralBalance] = useState("0");
  const [loanBalance, setLoanBalance] = useState("0");
  const [interestAccrued, setInterestAccrued] = useState("0");
  const [depositAmount, setDepositAmount] = useState("0");
  const [borrowAmount, setBorrowAmount] = useState("0");
  const [repayAmount, setRepayAmount] = useState("0");

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const rpcUrl = import.meta.env.VITE_EPHEMERY_RPC_URL;

  const contractABI = [
    "function depositCollateral(uint256 amount)",
    "function borrow(uint256 amount)",
    "function repay()",
    "function withdrawCollateral()",
    "function getUserData(address user) view returns (uint256, uint256, uint256)",
    "function calculateAccruedInterest(address user) view returns (uint256)",
  ];

  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      loadUserData(accounts[0]);
    }
  };

  const loadUserData = async (userAddress) => {
    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const contract = new Contract(contractAddress, contractABI, provider);

      const [collateral, loan, interest] = await contract.getUserData(
        userAddress
      );
      const currentInterest = await contract.calculateAccruedInterest(
        userAddress
      );

      setCollateralBalance(formatEther(collateral));
      setLoanBalance(formatEther(loan));
      setInterestAccrued(formatEther(interest + currentInterest));
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const deposit = async () => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);

      const amount = parseEther(depositAmount);
      const tx = await contract.depositCollateral(amount);
      await tx.wait();

      loadUserData(account);
      setDepositAmount("0");
    } catch (error) {
      console.error("Deposit error:", error);
    }
  };

  const borrow = async () => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);

      const amount = parseEther(borrowAmount);
      const tx = await contract.borrow(amount);
      await tx.wait();

      loadUserData(account);
      setBorrowAmount("0");
    } catch (error) {
      console.error("Borrow error:", error);
    }
  };

  const repay = async () => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);

      const tx = await contract.repay();
      await tx.wait();

      loadUserData(account);
    } catch (error) {
      console.error("Repay error:", error);
    }
  };

  const withdraw = async () => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractABI, signer);

      const tx = await contract.withdrawCollateral();
      await tx.wait();

      loadUserData(account);
    } catch (error) {
      console.error("Withdraw error:", error);
    }
  };

  useEffect(() => {
    if (account) {
      loadUserData(account);
    }
  }, [account]);

  return (
    <div className="app-container">
      <header>
        <h1>Lending Protocol</h1>
        <button onClick={connectWallet}>
          {account ? `Connected: ${account.slice(0, 6)}...` : "Connect Wallet"}
        </button>
      </header>

      <div className="dashboard">
        <div className="user-data">
          <h2>Your Position</h2>
          <div className="data-row">
            <span>Collateral (cUSD):</span>
            <span>{collateralBalance}</span>
          </div>
          <div className="data-row">
            <span>Loan (dDAI):</span>
            <span>{loanBalance}</span>
          </div>
          <div className="data-row">
            <span>Accrued Interest:</span>
            <span>{interestAccrued}</span>
          </div>
          <div className="data-row">
            <span>Collateralization Ratio:</span>
            <span>
              {loanBalance > 0
                ? `${(
                    (Number(collateralBalance) / Number(loanBalance)) *
                    100
                  ).toFixed(2)}%`
                : "∞"}
            </span>
          </div>
        </div>

        <div className="actions">
          <div className="action-card">
            <h3>Deposit Collateral</h3>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount in cUSD"
            />
            <button onClick={deposit}>Deposit</button>
          </div>

          <div className="action-card">
            <h3>Borrow</h3>
            <input
              type="number"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              placeholder="Amount in dDAI"
            />
            <button onClick={borrow}>Borrow</button>
            <p className="info-text">Max 66% of collateral value</p>
          </div>

          <div className="action-card">
            <h3>Repay Loan</h3>
            <p>
              Total to repay:{" "}
              {(Number(loanBalance) + Number(interestAccrued)).toFixed(4)} dDAI
            </p>
            <button onClick={repay}>Repay All</button>
          </div>

          <div className="action-card">
            <h3>Withdraw Collateral</h3>
            <button onClick={withdraw} disabled={Number(loanBalance) > 0}>
              Withdraw
            </button>
            {Number(loanBalance) > 0 && (
              <p className="error-text">Must repay loan first</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
