#! /bin/bash

# Run this one in parallel:
#   node_modules/.bin/testrpc --port 8989 --gasLimit 10000000
# 
mocha --reporter spec -t 10000 

#-g "Serial"

#-g "Organizer"

#-g "TicketCount"


#-g "Contract"

#-g "Batch"
