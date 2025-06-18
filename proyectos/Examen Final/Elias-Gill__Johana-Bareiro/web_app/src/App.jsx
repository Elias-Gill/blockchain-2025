import { useState, useEffect } from "react";
import { ethers } from "ethers";
import deploymentInfo from "../../deployment-info.json"; // Asegúrate de que la ruta es correcta

function App() {
  // Estados
  const [account, setAccount] = useState("");
  const [collateralBalance, setCollateralBalance] = useState("0");
  const [loanBalance, setLoanBalance] = useState("0");
  const [interestAccrued, setInterestAccrued] = useState("0");
  const [depositAmount, setDepositAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [cUSDBalance, setCUSDBalance] = useState("0");
  const [dDAIBalance, setDDAIBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState("");

  // Configuración desde deployment-info.json
  const contractAddress = deploymentInfo.contracts.LendingProtocol;
  const collateralTokenAddress = deploymentInfo.contracts.CollateralToken;
  const loanTokenAddress = deploymentInfo.contracts.LoanToken;
  const rpcUrl = import.meta.env.VITE_RPC_URL;

  // ABIs optimizadas
  const lendingProtocolABI = [
    "function depositCollateral(uint256 amount)",
    "function borrow(uint256 amount)",
    "function repay()",
    "function withdrawCollateral()",
    "function getUserData(address user) view returns (uint256 collateral, uint256 loan, uint256 interest)",
    "function calculateCurrentInterest(address user) view returns (uint256)",
    "function getCollateralRatio(address user) view returns (uint256)",
  ];

  const erc20ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function transfer(address, uint256) returns (bool)",
    "function transferFrom(address, address, uint256) returns (bool)",
    "function decimals() view returns (uint8)",
  ];

  // Conexión con MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Por favor instala MetaMask!");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();

      setNetwork(network.name);
      setAccount(accounts[0]);
      await loadAllData(accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert(`Error al conectar la billetera: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Cargar todos los datos del usuario
  const loadAllData = async (userAddress) => {
    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Cargar datos del protocolo
      const protocolContract = new ethers.Contract(
        contractAddress,
        lendingProtocolABI,
        provider
      );
      const [collateral, loan, interest] = await protocolContract.getUserData(
        userAddress
      );
      const currentInterest = await protocolContract.calculateCurrentInterest(
        userAddress
      );

      setCollateralBalance(ethers.formatEther(collateral));
      setLoanBalance(ethers.formatEther(loan));
      setInterestAccrued(ethers.formatEther(interest + currentInterest));

      // Cargar balances de tokens
      const cUSDContract = new ethers.Contract(
        collateralTokenAddress,
        erc20ABI,
        provider
      );
      const dDAIContract = new ethers.Contract(
        loanTokenAddress,
        erc20ABI,
        provider
      );

      const [cUSDBal, dDAIBal] = await Promise.all([
        cUSDContract.balanceOf(userAddress),
        dDAIContract.balanceOf(userAddress),
      ]);

      setCUSDBalance(ethers.formatEther(cUSDBal));
      setDDAIBalance(ethers.formatEther(dDAIBal));
    } catch (error) {
      console.error("Error loading data:", error);
      // Fallback a MetaMask provider si hay error
      if (window.ethereum) {
        const fallbackProvider = new ethers.BrowserProvider(window.ethereum);
        try {
          const protocolContract = new ethers.Contract(
            contractAddress,
            lendingProtocolABI,
            fallbackProvider
          );
          const [collateral, loan, interest] =
            await protocolContract.getUserData(userAddress);
          const currentInterest =
            await protocolContract.calculateCurrentInterest(userAddress);

          setCollateralBalance(ethers.formatEther(collateral));
          setLoanBalance(ethers.formatEther(loan));
          setInterestAccrued(ethers.formatEther(interest + currentInterest));

          const cUSDContract = new ethers.Contract(
            collateralTokenAddress,
            erc20ABI,
            fallbackProvider
          );
          const dDAIContract = new ethers.Contract(
            loanTokenAddress,
            erc20ABI,
            fallbackProvider
          );

          const [cUSDBal, dDAIBal] = await Promise.all([
            cUSDContract.balanceOf(userAddress),
            dDAIContract.balanceOf(userAddress),
          ]);

          setCUSDBalance(ethers.formatEther(cUSDBal));
          setDDAIBalance(ethers.formatEther(dDAIBal));
        } catch (fallbackError) {
          console.error("Fallback load failed:", fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Operaciones del protocolo
  const deposit = async () => {
    if (!validateInput(depositAmount)) return;

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const amount = ethers.parseEther(depositAmount);

      // 1. Aprobar gasto de cUSD
      const cUSDContract = new ethers.Contract(
        collateralTokenAddress,
        erc20ABI,
        signer
      );
      const approveTx = await cUSDContract.approve(contractAddress, amount);
      await approveTx.wait();

      // 2. Depositar colateral
      const protocolContract = new ethers.Contract(
        contractAddress,
        lendingProtocolABI,
        signer
      );
      const depositTx = await protocolContract.depositCollateral(amount);
      await depositTx.wait();

      await loadAllData(account);
      setDepositAmount("");
      alert("Depósito exitoso!");
    } catch (error) {
      console.error("Deposit error:", error);
      alert(`Error en depósito: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const borrow = async () => {
    if (!validateInput(borrowAmount)) return;

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const amount = ethers.parseEther(borrowAmount);

      const protocolContract = new ethers.Contract(
        contractAddress,
        lendingProtocolABI,
        signer
      );
      const borrowTx = await protocolContract.borrow(amount);
      await borrowTx.wait();

      await loadAllData(account);
      setBorrowAmount("");
      alert("Préstamo exitoso!");
    } catch (error) {
      console.error("Borrow error:", error);
      alert(`Error en préstamo: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const repay = async () => {
    if (Number(loanBalance) <= 0) {
      alert("No tienes deuda para pagar");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Calcular total a pagar
      const totalToRepay = ethers.parseEther(
        (Number(loanBalance) + Number(interestAccrued)).toString()
      );

      // 1. Aprobar gasto de dDAI
      const dDAIContract = new ethers.Contract(
        loanTokenAddress,
        erc20ABI,
        signer
      );
      const approveTx = await dDAIContract.approve(
        contractAddress,
        totalToRepay
      );
      await approveTx.wait();

      // 2. Pagar préstamo
      const protocolContract = new ethers.Contract(
        contractAddress,
        lendingProtocolABI,
        signer
      );
      const repayTx = await protocolContract.repay();
      await repayTx.wait();

      await loadAllData(account);
      alert("Pago exitoso!");
    } catch (error) {
      console.error("Repay error:", error);
      alert(`Error en pago: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async () => {
    if (Number(loanBalance) > 0) {
      alert("Debes pagar tu préstamo primero");
      return;
    }

    if (Number(collateralBalance) <= 0) {
      alert("No tienes colateral para retirar");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const protocolContract = new ethers.Contract(
        contractAddress,
        lendingProtocolABI,
        signer
      );
      const withdrawTx = await protocolContract.withdrawCollateral();
      await withdrawTx.wait();

      await loadAllData(account);
      alert("Retiro exitoso!");
    } catch (error) {
      console.error("Withdraw error:", error);
      alert(`Error en retiro: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Validación de inputs
  const validateInput = (value) => {
    if (!account) {
      alert("Conecta tu billetera primero");
      return false;
    }
    if (!value || Number(value) <= 0) {
      alert("Ingresa una cantidad válida");
      return false;
    }
    return true;
  };

  // Verificar conexión al cargar
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const network = await provider.getNetwork();
          setNetwork(network.name);
          loadAllData(accounts[0]);
        }
      }
    };

    checkConnection();
  }, []);

  // Calcular ratio de colateralización
  const calculateCollateralRatio = () => {
    if (Number(loanBalance) === 0) return "∞";
    const ratio = (Number(collateralBalance) / Number(loanBalance)) * 100;
    return `${ratio.toFixed(2)}%`;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div className="header-left">
          <svg
            className="icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            width="32"
            height="32"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h1>DeFi Lending Protocol</h1>
        </div>
        <div className="header-right">
          {network && <span className="network-badge">{network}</span>}
          <button
            onClick={connectWallet}
            className={`connect-button ${account ? "connected" : ""}`}
          >
            {account ? (
              <>
                <span className="pulse"></span>
                <span>{`${account.slice(0, 6)}...${account.slice(-4)}`}</span>
              </>
            ) : (
              "Connect Wallet"
            )}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="dashboard">
        {/* Left Panel */}
        <div className="user-data">
          <h2>Portfolio Overview</h2>
          <div className="data-row">
            <span>Wallet Balance</span>
            <span className="token-balance">{cUSDBalance} cUSD</span>
          </div>
          <div className="data-row">
            <span>Loan Balance</span>
            <span className="token-balance">{dDAIBalance} dDAI</span>
          </div>
        </div>

        <div className="user-data">
          <h2>Protocol Position</h2>
          <div className="data-row">
            <span>Collateral</span>
            <span className="token-balance">{collateralBalance} cUSD</span>
          </div>
          <div className="data-row">
            <span>Loan</span>
            <span className="token-balance">{loanBalance} dDAI</span>
          </div>
          <div className="data-row">
            <span>Interest</span>
            <span className="token-balance">{interestAccrued} dDAI</span>
          </div>
          <div className="data-row">
            <span>Collateral Ratio</span>
            <span
              className={`collateral-ratio ${
                loanBalance > 0 &&
                Number(collateralBalance) / Number(loanBalance) < 1.5
                  ? "danger"
                  : "safe"
              }`}
            >
              {calculateCollateralRatio()}
            </span>
          </div>
          {loanBalance > 0 && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    (Number(collateralBalance) / Number(loanBalance)) * 100
                  )}%`,
                }}
              ></div>
            </div>
          )}
        </div>
      </main>

        {/* Right Panel */}
        <div className="actions">
          {/* Deposit */}
          <div className="action-card">
            <h3>Deposit Collateral</h3>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
            />
            <button
              onClick={deposit}
              disabled={loading || !account}
              className="btn-primary"
            >
              {loading ? "Processing..." : "Deposit cUSD"}
            </button>
            <p className="info-text">
              Deposit cUSD as collateral to borrow against it.
            </p>
          </div>

          {/* Borrow */}
          <div className="action-card">
            <h3>Borrow dDAI</h3>
            <input
              type="number"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              placeholder="0.00"
            />
            <button
              onClick={borrow}
              disabled={loading || !account || Number(collateralBalance) === 0}
              className="btn-primary"
            >
              {loading ? "Processing..." : "Borrow dDAI"}
            </button>
            <p className="info-text">
              Maximum 66% of collateral value (150% ratio)
            </p>
          </div>

          {/* Repay */}
          <div className="action-card">
            <h3>Repay Loan</h3>
            <div>
              <p>Total to repay</p>
              <p className="token-balance error-text">
                {(Number(loanBalance) + Number(interestAccrued)).toFixed(4)}{" "}
                dDAI
              </p>
              <p className="info-text">
                Includes {interestAccrued} dDAI interest (5% weekly)
              </p>
            </div>
            <button
              onClick={repay}
              disabled={loading || Number(loanBalance) <= 0}
              className="btn-danger"
            >
              {loading ? "Processing..." : "Repay Full Amount"}
            </button>
          </div>

          {/* Withdraw */}
          <div className="action-card">
            <h3>Withdraw Collateral</h3>
            <div>
              <p>Available collateral</p>
              <p className="token-balance" style={{ color: "#10b981" }}>
                {collateralBalance} cUSD
              </p>
              {Number(loanBalance) > 0 && (
                <p className="error-text">You must repay your loan first</p>
              )}
            </div>
            <button
              onClick={withdraw}
              disabled={
                loading ||
                Number(loanBalance) > 0 ||
                Number(collateralBalance) <= 0
              }
              className="btn-success"
            >
              {loading ? "Processing..." : "Withdraw All"}
            </button>
          </div>
        </div>

      {/* Footer */}
      <footer
        className="info-text"
        style={{ textAlign: "center", marginTop: "40px" }}
      >
        DeFi Lending Protocol - Built with ❤️ for Blockchain course
      </footer>
    </div>
  );
}

export default App;
