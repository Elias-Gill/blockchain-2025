const express = require('express');
const { JsonRpcProvider } = require('ethers');
const cors = require('cors');

// Configuración inicial
const LOCAL_RPC_URL = "http://localhost:8545"; // Hardhat Network
const PORT = 3001;

// Crear app Express
const app = express();
const provider = new JsonRpcProvider(LOCAL_RPC_URL);

// Middlewares
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.send('Proxy RPC para Marketplace NFT');
});

// Endpoint RPC
app.post('/rpc', async (req, res) => {
  try {
    const { method, params = [], id } = req.body;
    
    console.log(`Solicitud RPC: ${method}`);
    
    // Validación básica
    if (!method || typeof id === 'undefined') {
      return res.status(400).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32600, message: "Invalid Request" }
      });
    }

    // Ejecutar método en la blockchain
    const result = await provider.send(method, params);
    
    res.json({ 
      jsonrpc: "2.0", 
      id, 
      result 
    });

  } catch (error) {
    console.error('Error en proxy:', error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id || null,
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message
      }
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Proxy RPC escuchando en http://localhost:${PORT}`);
  console.log(`Conectado a RPC: ${LOCAL_RPC_URL}`);
});
