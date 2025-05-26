import { useState, useEffect } from "react";
import { ethers } from "ethers";

function App() {
  // State Management Core
  // ----------------------
  // Rastrea la dirección de la billetera conectada y los datos del mercado de NFT
  // Cuenta: Dirección activa de Ethereum de MetaMask
  // NFT: Matriz de listados del mercado con metadatos y estado
  const [account, setAccount] = useState("");
  const [nfts, setNfts] = useState([]);

  // Blockchain Configuration
  // ------------------------
  // Dirección de contrato y punto final RPC cargados desde variables de entorno
  // Permite la implementación independiente de la red (conmutación entre la red de prueba y la red principal)
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const rpcUrl = "https://otter.bordel.wtf/erigon";

  // Wallet Connection System
  // ------------------------
  // Gestiona la integración de MetaMask y el flujo de autorización
  // Utiliza el estándar EIP-1102 para solicitudes de acceso a cuentas
  // Almacena la primera cuenta autorizada en el estado del componente
  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
    }
  };

  // Marketplace Data Loader
  // -----------------------
  // Mecanismo principal de obtención de datos para listados de NFT
  // 1. Inicializa el proveedor de Ethereum de solo lectura
  // 2. Crea una instancia de contrato con definiciones de ABI
  // 3. Itera los posibles ID de NFT (0-9)
  // 4. Para cada NFT:
  // - Obtiene los detalles del listado en cadena (propietario, precio, estado)
  // - Resuelve la URI de metadatos IPFS del contrato
  // - Convierte la URI IPFS en la URL de la puerta de enlace HTTPS
  // - Obtiene y analiza metadatos JSON
  // - Construye el objeto de datos NFT completo
  // 5. Implementa la gestión de errores por NFT para evitar fallos completos
  // 6. Actualiza el estado del componente con resultados agregados

  const loadMarketItems = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(
        contractAddress,
        [
          "function getListing(uint256) view returns (address, uint256, bool)",
          "function tokenURI(uint256) view returns (string)",
        ],
        provider
      );

      const items = [];
      for (let i = 1; i < 10; i++) {
        try {
          const [owner, price, isSold] = await contract.getListing(i);
          const tokenURI = await contract.tokenURI(i);
            console.log(tokenURI)

          const metadataUrl = tokenURI.replace(
            "ipfs://",
            "https://nftstorage.link/ipfs/"
          );
            console.log(metadataUrl)
          const response = await fetch(metadataUrl);
          const metadata = await response.json();

          items.push({
            id: i,
            owner,
            price: price,
            isSold,
            image: metadata.image.replace("ipfs://", "https://nftstorage.link/ipfs/"),
            name: metadata.name,
          });
        } catch (error) {
          console.error(`Error processing NFT ${i}:`, error);
        }
      }
      setNfts(items);
    } catch (error) {
      console.error("Global error:", error);
    }
  };

  // NFT Purchase Engine
  // -------------------
  // Gestiona todo el flujo de trabajo de compra:
  // 1. Inicializa el proveedor con capacidad de escritura con la billetera del usuario
  // 2. Crea una instancia de contrato con el firmante para la autorización de la transacción
  // 3. Ejecuta la función buy() con el valor exacto de ETH
  // 4. Espera la confirmación de la transacción (inclusión del bloque)
  // 5. Activa la actualización del mercado para actualizar el estado de la interfaz de usuario
  // Implementa la gestión de errores en caso de transacciones fallidas

  const purchase = async (tokenId, price) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        ["function buy(uint256) payable"],
        signer
      );

      const tx = await contract.buy(tokenId, {
        value: price,
      });
      await tx.wait();
      loadMarketItems();
    } catch (error) {
      console.error("Purchase error:", error);
    }
  };

  // Initialization Hook
  // -------------------
  // Activa la carga inicial de datos al montar el componente
  // Una matriz de dependencias vacía garantiza una ejecución única
  useEffect(() => {
    loadMarketItems();
  }, []);

  // UI Rendering System
  // -------------------
  // Estructura del diseño de componentes:
  // - Botón de estado de conexión (texto dinámico)
  // - Diseño de cuadrícula NFT adaptable
  // - Tarjetas NFT individuales que contienen:
  // * Imagen de metadatos IPFS
  // * Nombre y precio de ETH formateado
  // * Botón de compra interactivo con gestión de estado
  // La visualización del precio convierte los valores wei de BigNumber a ETH
  // El estado del botón de compra desactivado refleja la disponibilidad de NFT
  return (
    <div>
      <button className="connect-button" onClick={connectWallet}>
        {account ? `Connected: ${account.slice(0, 6)}...` : "Connect Wallet"}
      </button>

      <div className="nft-grid">
        {nfts.map((nft) => (
          <div key={nft.id} className="nft-card">
            <img
              src={nft.image}
              alt={nft.name}
              style={{ width: "200px", height: "200px" }}
            />
            <h3>{nft.name}</h3>

            <div>Price: {ethers.utils.formatEther(nft.price)} ETH</div>

            <button
              onClick={() => purchase(nft.id, nft.price)}
              disabled={nft.isSold}
            >
              {nft.isSold ? "Sold" : "Buy"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
