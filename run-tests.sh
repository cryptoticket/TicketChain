#! /bin/bash

# Run this one in parallel:
#   node_modules/.bin/testrpc --port 8989 --gasLimit 10000000
# 
mocha --reporter spec -t 10000 -g "Files"

#-g "Batch"

#-g "Organizer"


#-g "Serial"

#-g "TicketCount"

#-g "Contract"

