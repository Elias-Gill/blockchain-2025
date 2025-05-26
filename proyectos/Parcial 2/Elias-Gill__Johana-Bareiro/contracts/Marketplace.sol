// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Core Contract Architecture
// --------------------------
// Mercado de NFT ERC-721 con sistema de listado integrado
// Hereda de la implementación ERC721 de OpenZeppelin con almacenamiento URI
// Combina el seguimiento de la propiedad de NFT con la funcionalidad de mercado
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Marketplace is ERC721, ERC721URIStorage {
    // Token ID Management System
    // --------------------------
    // Contador de incremento automático para ID de tokens NFT
    // Garantiza identificadores únicos para los artículos del mercado
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Marketplace State Structure
    // ---------------------------
    // Rastrea la propiedad, el precio y la disponibilidad de los NFT
    // propietario: Titular actual del NFT (vendedor hasta la compra)
    // precio: Precio de venta en wei (aritmética de punto fijo)
    // isSold: Indicador de estado de compra (evita la doble venta)
    struct Listing {
        address owner;
        uint256 price;
        bool isSold;
    }

    // Marketplace Storage System
    // --------------------------
    // Almacén de datos principal que conecta los ID de token con los listados
    // Permite la búsqueda O(1) para las operaciones del mercado
    mapping(uint256 => Listing) public listings;

    // Marketplace Event System
    // ------------------------
    // Emite notificaciones de blockchain para actividades clave del mercado
    // Artículo listado: Creación de un nuevo anuncio de NFT
    // Artículo vendido: Transferencia y compra de NFT exitosas
    event ItemListed(uint256 indexed tokenId, address seller, uint256 price);
    event ItemSold(uint256 indexed tokenId, address buyer, uint256 price);

    // Contract Initialization
    // -----------------------
    // Configura el token ERC721 con nombre/símbolo
    // Inicializa el contador de ID del token y la funcionalidad del contrato base
    constructor() ERC721("MarketNFT", "MNFT") {}

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // NFT Lifecycle Management
    // ------------------------
    // Anulación de la función de grabación para la limpieza del almacenamiento URI
    // Garantiza una gestión adecuada del estado cuando se destruyen los tokens
    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    // Metadata Resolution System
    // --------------------------
    // Devuelve la URI de los metadatos NFT almacenados
    // Hereda de ambas implementaciones de ERC721 para una funcionalidad completa
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    // NFT Creation & Listing Engine
    // -----------------------------
    // Flujo de trabajo combinado de acuñación y publicación en el mercado:
    // 1. Generación de un nuevo ID de token mediante un sistema de contadores
    // 2. Acuñación de NFT a la dirección del creador
    // 3. Almacena la URI de metadatos mediante ERC721URIStorage
    // 4. Aprobación del contrato del mercado para transferencias
    // 5. Creación de la publicación inicial en el mercado
    // 6. Emisión de un evento de publicación para seguimiento fuera de la cadena
    function mintAndList(string memory _tokenURI, uint256 _price) external {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        _approve(address(this), tokenId);
        listings[tokenId] = Listing(msg.sender, _price, false);
        emit ItemListed(tokenId, msg.sender, _price);
    }

    // NFT Purchase System
    // -------------------
    // Gestiona todo el ciclo de compra:
    // 1. Valida la disponibilidad del anuncio y el importe del pago
    // 2. Marca el NFT como vendido para evitar el doble gasto
    // 3. Ejecuta la transferencia de propiedad mediante ERC721 _transfer
    // 4. Reenvía el pago al vendedor mediante transferencia ETH nativa
    // 5. Emite un evento de venta para el seguimiento de la transacción
    // 6. Incluye comprobaciones de seguridad para el éxito de la transferencia
    function buy(uint256 tokenId) external payable {
        Listing storage listing = listings[tokenId];
        require(!listing.isSold, "Already sold");
        require(msg.value >= listing.price, "Insufficient funds");

        listing.isSold = true;
        _transfer(listing.owner, msg.sender, tokenId);
        (bool success, ) = listing.owner.call{value: msg.value}("");
        require(success, "Transfer failed");
        emit ItemSold(tokenId, msg.sender, listing.price);
    }

    // Marketplace Data Access
    // -----------------------
    // Proporciona acceso de lectura a los detalles de las publicaciones
    // Permite que los servicios externos consulten el estado del Marketplace
    function getListing(
        uint256 tokenId
    ) external view returns (Listing memory) {
        return listings[tokenId];
    }

    // Funds Management System
    // -----------------------
    // Permite al titular del contrato retirar las comisiones acumuladas
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
