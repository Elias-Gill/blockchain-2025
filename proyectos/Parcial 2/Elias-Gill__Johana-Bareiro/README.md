# NFT Marketplace - TP Universitario

## Requisitos
- Node.js (versión 18 o superior)
- Extensión de navegador Metamask instalada

## Instrucciones para ejecución

### Configuración inicial

1. Editar el archivo `env_example` con:
   - PRIVATE_KEY:
     Clave privada de una wallet de prueba
2. Renombrar y duplicar el archivo de variables de entorno:
```bash
mv env_example .env
cp .env web_app/

Luego de ello se debe añadir la red testnet para las pruebas con la billetera en metamask:
```txt
Nombre de red: "ephemery-testnet"
URL de red: "https://otter.bordel.wtf/erigon"
Identificador de cadena: 39438146
Simbolo de moneda: "ETH"
Direccion de explorador: "https://explorer.ephemery.dev"
```

### Opciones de ejecución

#### Usar contrato existente (recomendado):

El proyecto incluye un contrato ya desplegado y se puede correr directamente con el script
`run.sh`.
Este script levanta el nodo hardhat y corre el frontend.
```bash
sh run.sh
```

#### Desplegar nuevo contrato

Primeramente ejecutar el script
```bash
sh deploy.sh
```

Este nos dara el nombre del nuevo contrato, copiarlo y modificar nuestro `.env`:

```bash
VITE_CONTRACT_ADDRESS=contract_address
```

### Cargar NFTs personalizados

Si se quiere contar con NFTs personalizados, se puede modificar la variable `IPFS_CODE` para
modificar el codigo del storage de nuestros NFTs.

## Estructura del proyecto
- contracts/:
  Contratos inteligentes
- scripts/:
  Script de despliegue `deploy.sh`
- web_app/:
  Aplicación frontend React

## Notas importantes
1. El contrato viene pre-desplegado con los respectivos mints para facilitar las pruebas
2. Al desplegar nuevo contrato, se mintean automáticamente 10 NFTs
3. Se requiere fondos de prueba en la wallet para transacciones
4. El frontend se actualiza automáticamente al hacer cambios

Para cualquier problema durante la ejecución, verificar:
- Que las variables de entorno estén correctamente configuradas
- Que la wallet tenga fondos de prueba
- Que la dirección del contrato sea correcta si se hizo redeploy
