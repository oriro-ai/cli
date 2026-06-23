---
watermark: ORIRO
disable-model-invocation: true
name: blockchain-web3
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Blockchain and Web3 — consensus mechanisms, smart contracts, Ethereum/Solidity,
  DeFi, NFTs, and practical blockchain development. Sources: Ethereum documentation
  (CC-BY-SA), Solidity docs (GPL), OpenZeppelin (MIT).
---

# Blockchain and Web3 Development

## Blockchain fundamentals

### How a blockchain works

Linked blocks: Each block contains hash of previous block + transactions + timestamp + nonce.
Changing any block invalidates all subsequent blocks.
**Immutability** comes from this chained structure, not encryption.

### Consensus mechanisms

**Proof of Work (PoW):** Bitcoin. Miners solve computational puzzle. Energy intensive.
**Proof of Stake (PoS):** Ethereum (post-Merge). Validators stake ETH. Energy efficient (~99.95% less energy than PoW).
**Delegated PoS:** Token holders vote for validators. Faster but more centralized.

## Ethereum and smart contracts

### Smart contracts

Self-executing code on the blockchain. Code is law.
Deployed once, immutable (unless using proxy patterns).
**Gas:** Computation fee. ETH burned since EIP-1559 (Aug 2021).

### Solidity basics

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    constructor(uint256 _supply) {
        totalSupply = _supply;
        balances[msg.sender] = _supply;
    }

    function transfer(address _to, uint256 _amount) public {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        balances[msg.sender] -= _amount;
        balances[_to] += _amount;
    }
}
```

**Data types:** uint256, address, bool, string, bytes32.
**Visibility:** public, private, internal, external.
**State variables** cost gas to write. Local variables are free.

## Token standards

**ERC-20:** Fungible tokens. Most DeFi tokens. transferFrom, approve, allowance.
**ERC-721:** Non-fungible tokens (NFTs). Each token has unique ID.
**ERC-1155:** Multi-token standard. Mix fungible and NFT in one contract.

## DeFi primitives

**DEX (Decentralized Exchange):** Uniswap AMM model. x × y = k constant product formula.
**Lending protocols:** Aave, Compound. Overcollateralized loans. Health factor triggers liquidation.
**Yield farming:** Provide liquidity → receive trading fees + token rewards.

## Development tools

**Hardhat:** Local Ethereum development. Testing in TypeScript/JavaScript.
**Foundry:** Rust-based. Fast testing in Solidity.
**OpenZeppelin:** Audited contract templates. Use instead of writing from scratch.
**Wagmi/viem:** React hooks for Ethereum frontend.

Sources: Ethereum documentation (ethereum.org — CC-BY-SA, free),
Solidity docs (docs.soliditylang.org — GPL, free), OpenZeppelin docs (MIT, free)
