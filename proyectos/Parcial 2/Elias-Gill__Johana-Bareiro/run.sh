# Colores para la salida
ERROR='\033[0;31m'
GOOD='\033[0;32m'
NORMAL='\033[1;34m'
NC='\033[0m' # No Color

# Función para manejar errores
handle_error() {
    echo -e "${ERROR}Error en el paso: $1${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 1
}

# Paso 1: Compilar contratos
echo -e "\n${NORMAL}Compilando contratos...${NC}"
npx hardhat compile || handle_error "Compilación"

# Paso 2: Iniciar nodo de Hardhat en segundo plano
echo -e "\n${NORMAL}Iniciando nodo Hardhat en segundo plano...${NC}"
npx hardhat node >hardhat.log 2>&1 &
HARDHAT_PID=$!
sleep 5 # Esperar a que el nodo esté listo

# Verificar si el nodo se inició correctamente
if ! ps -p $HARDHAT_PID >/dev/null; then
    handle_error "Inicio del nodo Hardhat"
fi

# Paso 3: Desplegar contratos
echo -e "\n${NORMAL}Desplegando contratos...${NC}"
npx hardhat run scripts/deploy.js --network ephemery || handle_error "Despliegue"

# Paso 4: Mint tokens (en segundo plano)
echo -e "\n${NORMAL}Generando 10 NFTs...${NC}"
npx hardhat run scripts/mint10.js --network localhost || handle_error "Minting"

# Paso 6: Iniciar frontend (en segundo plano)
echo -e "\n${NORMAL}Iniciando frontend...${NC}"
cd web_app && npm run dev &
FRONTEND_PID=$!
cd ..

# Mantener el script corriendo
echo -e "\n${GOOD}Proceso completo!${NC}"
echo -e "${NORMAL}Servicios en ejecución:${NC}"
echo -e "1. Nodo Hardhat (PID: $HARDHAT_PID)"
echo -e "2. Frontend (PID: $FRONTEND_PID)"
echo -e "\nPresiona Ctrl+C para terminar todos los procesos"

# Capturar Ctrl+C para limpiar
trap "kill $HARDHAT_PID $FRONTEND_PID 2>/dev/null; echo -e '\n${GOOD}Logs generados${NC}:\n - proxy.log\n - harhadt.log';exit" SIGINT

# Esperar a que todos los procesos terminen (en teoría no deberían)
wait
