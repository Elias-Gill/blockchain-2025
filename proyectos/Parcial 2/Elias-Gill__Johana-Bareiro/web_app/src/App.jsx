import { useEffect, useState } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ABI actualizada con funciones de verificación NFT
const ABI = [
  "function getListing(uint256 tokenId) public view returns (address, uint96, bool)",
  "function tokenCounter() public view returns (uint256)",
  "event ItemListed(uint256 tokenId, address seller, uint96 price)",
  "function supportsInterface(bytes4 interfaceId) public view returns (bool)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)"
];

const provider = new ethers.providers.JsonRpcProvider("http://localhost:3001/rpc");

export default function App() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNFTs();
  }, []);

  async function verifyNFT(contract, tokenId) {
    try {
      // Verifica si el contrato implementa ERC721
      const isERC721 = await contract.supportsInterface("0x80ac58cd");
      if (!isERC721) return false;

      // Verifica ownership válido
      const owner = await contract.ownerOf(tokenId);
      if (owner === ethers.constants.AddressZero) return false;

      // Verifica que tokenURI exista
      const tokenURI = await contract.tokenURI(tokenId);
      return tokenURI.startsWith("http") || tokenURI.startsWith("ipfs://");
      
    } catch (err) {
      console.error(`Error verificando NFT ${tokenId}:`, err);
      return false;
    }
  }

  async function getNFTImage(contract, tokenId) {
    try {
      const tokenURI = await contract.tokenURI(tokenId);
      
      if (tokenURI.startsWith("ipfs://")) {
        return `https://ipfs.io/ipfs/${tokenURI.replace("ipfs://", "")}`;
      }
      
      if (tokenURI.startsWith("http")) {
        const response = await fetch(tokenURI);
        const metadata = await response.json();
        return metadata.image || `https://via.placeholder.com/200x200.png?text=NFT+${tokenId}`;
      }
      
      return `https://via.placeholder.com/200x200.png?text=NFT+${tokenId}`;
    } catch {
      return `https://via.placeholder.com/200x200.png?text=NFT+${tokenId}`;
    }
  }

  async function loadNFTs() {
    setLoading(true);
    setError("");
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      
      const totalNFTs = (await contract.tokenCounter()).toNumber();
      console.log(`Total NFTs: ${totalNFTs}`);

      const results = [];
      for (let i = 0; i < totalNFTs; i++) {
        try {
          const [owner, price, isSold] = await contract.getListing(i);
          const isVerified = await verifyNFT(contract, i);
          const imageUrl = await getNFTImage(contract, i);

          results.push({
            id: i,
            owner,
            price: ethers.utils.formatEther(price),
            isSold,
            isVerified,
            imageUrl
          });
        } catch (err) {
          console.warn(`Error cargando NFT ${i}:`, err.message);
        }
      }
      
      setItems(results);
    } catch (err) {
      console.error("Error general:", err);
      setError("Error al cargar NFTs. Ver consola para detalles.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Marketplace NFT</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      
      <button 
        onClick={loadNFTs} 
        disabled={loading}
        style={{ 
          marginBottom: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        {loading ? "Cargando..." : "Recargar NFTs"}
      </button>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "1rem"
      }}>
        {items.length === 0 ? (
          <p>No hay NFTs para mostrar.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} style={{
              border: item.isVerified ? "2px solid #4CAF50" : "2px dashed #f44336",
              padding: "1rem",
              borderRadius: "8px",
              backgroundColor: item.isSold ? "#f0f0f0" : "white",
              position: "relative"
            }}>
              {!item.isVerified && (
                <div style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}>
                  NO VERIFICADO
                </div>
              )}
              
              <img
                src={item.imageUrl}
                alt={`NFT ${item.id}`}
                style={{ 
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                  borderRadius: "4px"
                }}
              />
              <h3>NFT #{item.id}</h3>
              <p><strong>Precio:</strong> {item.price} ETH</p>
              <p>
                <strong>Estado:</strong> 
                <span style={{ color: item.isSold ? "#f44336" : "#4CAF50" }}>
                  {item.isSold ? " Vendido" : " En venta"}
                </span>
              </p>
              <p>
                <small>
                  <strong>Dueño:</strong> {item.owner.substring(0, 6)}...{item.owner.substring(38)}
                </small>
              </p>
              {item.isVerified && (
                <div style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  color: "#4CAF50"
                }}>
                  ✔️ NFT Verificado
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
