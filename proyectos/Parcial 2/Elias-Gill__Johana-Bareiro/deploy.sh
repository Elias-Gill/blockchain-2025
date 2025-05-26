ERROR='\033[0;31m'
GOOD='\033[0;32m'
NORMAL='\033[1;34m'
NC='\033[0m'

handle_error() {
    echo -e "${ERROR}Error en el paso: $1${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 1
}

echo -e "\n${NORMAL}Compilando contratos...${NC}"
npx hardhat compile || handle_error "Compilación"

echo -e "\n${NORMAL}Iniciando nodo Hardhat en segundo plano...${NC}"
npx hardhat node > /dev/null 2>&1 &
HARDHAT_PID=$!
sleep 5

if ! ps -p $HARDHAT_PID > /dev/null; then
    handle_error "Inicio del nodo Hardhat"
fi

echo -e "\n${NORMAL}Desplegando contrato y minteando NFTs...${NC}"
npx hardhat run scripts/deploy.js --network ephemery || handle_error "Despliegue y minting"

echo -e "\n${GOOD}Proceso completado exitosamente.${NC}"

kill $HARDHAT_PID
