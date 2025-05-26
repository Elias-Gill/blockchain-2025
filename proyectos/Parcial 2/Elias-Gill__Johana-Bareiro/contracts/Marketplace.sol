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
    // Token ID Management
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Marketplace Structure
    struct Listing {
        address owner;
        uint256 price;
        bool isSold;
    }

    // Marketplace Storage
    mapping(uint256 => Listing) public listings;

    // Marketplace Events
    event ItemListed(uint256 indexed tokenId, address seller, uint256 price);
    event ItemSold(uint256 indexed tokenId, address buyer, uint256 price);

    // Contract Initialization
    constructor() ERC721("MarketNFT", "MNFT") {}

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // NFT Lifecycle
    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    // Metadata Resolution
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    // NFT Creation & Listing
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
    function getListing(
        uint256 tokenId
    ) external view returns (Listing memory) {
        return listings[tokenId];
    }

    // Funds Management System
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
