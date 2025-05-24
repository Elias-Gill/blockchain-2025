// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters/Counters.sol";

contract Marketplace is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct Listing {
        address seller;
        uint96 price;
        bool isSold;
    }

    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public balances;

    event ItemListed(uint256 indexed tokenId, address seller, uint96 price);
    event ItemSold(uint256 indexed tokenId, address buyer, address seller, uint96 price);
    event Withdrawal(address indexed recipient, uint256 amount);

    constructor() ERC721("Parcial2NFT", "PNFT") Ownable(msg.sender) {}

    function mintAndList(string memory _tokenURI, uint96 _price) public {
        require(_price > 0, "Price must be > 0");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        listings[newTokenId] = Listing(msg.sender, _price, false);
        emit ItemListed(newTokenId, msg.sender, _price);
    }

    function buy(uint256 _tokenId) external payable {
        require(_exists(_tokenId), "NFT does not exist");

        Listing storage listing = listings[_tokenId];
        require(!listing.isSold, "Item already sold");
        require(msg.value == listing.price, "Incorrect ETH amount");
        require(msg.sender != listing.seller, "Seller cannot buy");

        listing.isSold = true;
        balances[listing.seller] += msg.value;
        
        _transfer(listing.seller, msg.sender, _tokenId);
        emit ItemSold(_tokenId, msg.sender, listing.seller, listing.price);
    }

    function getListing(uint256 _tokenId) public view returns (address, uint96, bool) {
        require(_exists(_tokenId), "NFT does not exist");
        Listing memory listing = listings[_tokenId];
        return (listing.seller, listing.price, listing.isSold);
    }

    function tokenCounter() public view returns (uint256) {
        return _tokenIds.current();
    }

    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        balances[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }

    function batchMint(address[] calldata recipients, string[] calldata uris, uint96[] calldata prices) external onlyOwner {
        require(recipients.length == uris.length && uris.length == prices.length, "Array length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _tokenIds.increment();
            uint256 newTokenId = _tokenIds.current();
            
            _safeMint(recipients[i], newTokenId);
            _setTokenURI(newTokenId, uris[i]);
            
            listings[newTokenId] = Listing(recipients[i], prices[i], false);
            emit ItemListed(newTokenId, recipients[i], prices[i]);
        }
    }
}
