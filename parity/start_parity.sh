#! /bin/bash

# Default Path: 
# ~/.local/share/io.parity.ethereum/

parity --geth --jsonrpc --chain=kovan-config.json --jsonrpc-apis "web3,eth,net,personal,traces,rpc" --jsonrpc-cors "*" --jsonrpc-port "8545" --jsonrpc-hosts "all" --jsonrpc-interface "0.0.0.0" --password "parity.pass" --tx-gas-limit "5000000" --unlock 0xdf8845a26e1db43236e591a863289ad5c1fcda5a
