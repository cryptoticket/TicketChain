# TicketChain project

## Before you go
### For Ubuntu only:
* **sudo apt-get install build-essential make**
* Install npm/node: 
     **sudo apt-get install npm nodejs**
* Before running install Mocha and Forever:
     **npm install \-\-global mocha forever**
* Install mongodb: see **scripts/installmongo.sh**
* Modify **config.json** and **package.json**
* Add valid HTTPS (SSL) certificates to cert folder
* Run **npm install**
* To install as a daemon: ./scripts/installdaemon.sh
* DO NOT FORGET TO CHANGE 'salt' in config.json! Using sample salt will lead to vulnerability!
* Use HTTPS only (set *enable_https* to true config.json) to prevent JWT or other data stealing in the middle
* Run tests (see below)

## Run:
* To run tests:
     ./run-tests.sh

* To run single test:
     **npm test**
     or
     **mocha \-\-reporter spec -g my_test**

* To run as a console application:
     **node main.js**

* To run as a daemon:
     **sudo /etc/init.d/ticketchain start**

* To check out DB:
     mongo
     use 'ticketchain'
     db.users.find()

# APIs

