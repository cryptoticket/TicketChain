#! /bin/bash

# Run this one in parallel:
#   node_modules/.bin/testrpc --port 8989 --gasLimit 10000000
# 
mocha --reporter spec -t 90000 

#-g "Serial"

#-g "Batch"

#-g "Pagination"

#-g "Organizer"

#-g "Contract"

#-g "Files"


#-g "TicketCount"


