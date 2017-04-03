#! /bin/bash

# Run this one in parallel:
#   node_modules/.bin/testrpc --port 8989 --gasLimit 10000000
# 
# In config.json: 
#    "test_node":"http://138.201.89.68:8545"
#    "test_node":"http://localhost:8989"

#env ETH_NODE=http://ethnode.chain.cloud:8545 ETH_MAIN_ADDRESS=0x0605bf0970025A6DD604f5fE481Cc307E9d5450e mocha --reporter spec -t 90000 -g "Contract2"

env ETH_NODE=http://localhost:8989 mocha --reporter spec -t 90000 -g "Organizer"

#-g "Contract2"

#-g "Contract"

#-g "Batch"

#-g "Pagination"



#-g "Files module 2"


#-g "Serial"

#-g "TicketCount"

#################################################################################
#################################################################################
# To create new account:
#    sudo geth --datadir "/backup/fast-testnet/testnet" account new 

# To unlock account:
#    sudo geth --datadir "/backup/fast-testnet/testnet" account update 0

# To attach:
#    sudo geth attach http://localhost:8545

# To start
#    screen -c /home/ubuntu/new_start_kill_shells/screenrc_gft -L -dmS gft_geth /usr/bin/geth --fast --rpc --rpcport "8545" --rpcaddr "0.0.0.0" --rpccorsdomain "*" --rpcapi eth,web3,personal  --port 30309 --testnet --datadir "/backup/fast-testnet" --ipcpath "/big/ftn" 2>&1

# To create new account from console:
#    web3.personal.newAccount()

# To check account balance:
#    web3.eth.getBalance(web3.eth.accounts[0])

# To unlock from console:
#    web3.personal.unlockAccount(web3.eth.accounts[0])

# Show last syncronized block:
#    web3.eth.getBlock('latest').number

