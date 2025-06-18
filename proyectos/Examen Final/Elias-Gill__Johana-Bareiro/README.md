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
```

### Configuracion de Holesky testnet

Simplemente con ir a la pagina principal y darle a anadir red:
https://hoodi.ethpandaops.io/ 

`Faucet:` https://hoodi-faucet.pk910.de/ (NOTA:
dejar minimo un minuto y medio corriendo)

## Ejecución

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

Los addresses de los contratos son actualizados automáticamente, asi que simplemente puede
correr el run.sh de nuevo.

## Notas importantes
1. El contrato viene pre-desplegado con los respectivos mints para facilitar las pruebas
3. Se requiere fondos de prueba en la wallet para transacciones
4. El frontend se actualiza automáticamente al hacer cambios

Para cualquier problema durante la ejecución, verificar:
- Que las variables de entorno estén correctamente configuradas
- Que la wallet tenga fondos de prueba

# Estructura del Proyecto

```
.
├── contracts
│   ├── CollateralToken.sol      # Token colateral usado por el protocolo
│   ├── ERC20Mock.sol            # Token ERC20 de prueba para tests y cobertura
│   ├── EvilToken.sol            # Token malicioso de prueba para casos negativos
│   ├── Interfaces.sol           # Interfaces ILoanToken y ICollateralToken
│   ├── LendingProtocol.sol      # Contrato principal del protocolo de préstamos
│   └── LoanToken.sol            # Token del préstamo, emitido por el protocolo
├── test
│   └── LendingProtocol.test.js  # Tests principales, incluyendo coverage extra
├── scripts
│   └── deploy.js                # Script de despliegue de contratos
├── coverage/                    # Reportes de cobertura de Hardhat
├── artifacts/                  # Archivos compilados por Hardhat
├── web_app/                    # Frontend hecho con React y Vite
├── hardhat.config.js           # Configuración de Hardhat
├── package.json
└── README.md
```

## Notas sobre los contratos auxiliares

Los contratos `ERC20Mock.sol` y `EvilToken.sol` **no forman parte del protocolo funcional**,
pero son **estrictamente necesarios para lograr una cobertura completa de ramas y funciones**.
Esto se debe a que ciertas ramas lógicas en `LendingProtocol.sol` y otros contratos **no pueden
ser accedidas directamente sin simular tokens con comportamientos específicos**, como:

* Un token que **falla al hacer `transfer` o `transferFrom`** (`EvilToken.sol`)
* Un token mintable de forma controlada (`ERC20Mock.sol`)

Estos contratos permiten testear rutas de error y edge cases que, de otro modo, quedarían sin
ejecutar y disminuirían el coverage global.
