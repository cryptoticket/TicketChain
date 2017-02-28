#! /bin/bash

# Run this one in parallel:
#   node_modules/.bin/testrpc --port 8989 --gasLimit 10000000
# 
mocha --reporter spec -t 30000 -g "Organizer"

#-g "Contract"

#-g "Files"


#-g "Pagination"

#-g "Batch"

#-g "Serial"

#-g "TicketCount"


