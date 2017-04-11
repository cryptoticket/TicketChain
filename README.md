# TicketChain project

Heroku **master** branch Build - [![Heroku Master branch Build](https://heroku-badge.herokuapp.com/?app=ticketchain-backend)](https://ticketchain-backend.herokuapp.com)

[API description is here](http://docs.ticketchain.apiary.io)

## Before you go
### For Ubuntu only:
* **sudo apt-get install build-essential make**
* Install npm/node: 
     **sudo apt-get install npm nodejs**
* Before running install Mocha and Forever:
     **npm install \-\-global mocha forever**
* Install mongodb: see **scripts/installmongo.sh**
* Run **npm install**
* Use HTTPS only (set *enable_https* to true config.json) to prevent JWT or other data stealing in the middle
* Run tests (see below)

## Run:

### Environment vars
Before running - set these env.vars:

* IS_TASK_PROCESSOR - true (example)
* MONGODB_URI - mongodb://heroku_qvmn1bxg:1qebii0edmrjjt9hvkipsjscv5@ds151059.mlab.com:51059/heroku_qvmn1bxg (example)
* ETH_MAIN_ADDRESS - 0x0605bf0970025A6DD604f5fE481Cc307E9d5450e (example)
* ETH_NODE - http://ethnode.chain.cloud:8545 (example)
* ETH_EXPLORER_ADDRESS_LINK - https://kovan.etherscan.io/address/ (example)


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

## Deploy to Heroku

```
git push heroku master
```

