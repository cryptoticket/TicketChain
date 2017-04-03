#! /bin/bash

# Default Path: 
# ~/.local/share/io.parity.ethereum/

# Kovan
parity --geth --jsonrpc --chain=kovan --jsonrpc-apis "web3,eth,net,personal,traces,rpc" --jsonrpc-cors "*" --jsonrpc-port "8545" --jsonrpc-hosts "all" --jsonrpc-interface "0.0.0.0" --password "parity.pass" --tx-gas-limit 9000000 --unlock 0xdf8845a26e1db43236e591a863289ad5c1fcda5a --force-ui --ui-interface "0.0.0.0" --ui-no-validation --auto-update=all --max-peers 10 --min-peers 5 --allow-ips public

# Ropsten
#parity --geth --jsonrpc --chain=ropsten --jsonrpc-apis "web3,eth,net,personal,traces,rpc" --jsonrpc-cors "*" --jsonrpc-port "8545" --jsonrpc-hosts "all" --jsonrpc-interface "0.0.0.0" --password "parity.pass" --tx-gas-limit 9000000 --force-ui --ui-interface "0.0.0.0" --ui-no-validation --max-peers 10 --min-peers 5 --allow-ips public

