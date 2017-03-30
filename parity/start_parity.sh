#! /bin/bash

parity --geth --jsonrpc --chain=kovan-config.json --jsonrpc-apis "web3,eth,net,personal,traces,rpc" --jsonrpc-cors "*" --jsonrpc-port "8545" --jsonrpc-hosts "all" --jsonrpc-interface "0.0.0.0" --password "parity.pass" --tx-gas-limit "5000000"

# --unlock 0xf123
