var solc = require('solc');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8989"));

var fs = require('fs');
var assert = require('assert');
var async = require('async');
var BigNumber = require('bignumber.js');

var abi;
var accounts;
var creator;

var contractAddress;
var contract;

// init BigNumber
var unit = new BigNumber(Math.pow(10,18));

function deployContract1(cb){
     var file = './contracts/Ticket.sol';
     // TODO: fix it!
     var contractName = ':Ticket';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          var output = solc.compile(source, 1); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          // Params:
          var date_created = 0;
          var price_kop = 100;
          var is_paper_ticket = false;

          var event_title = "";
          var event_place_title = "";
          var event_date = "";
          var event_place_address = "";

          var row = "12";
          var seat = "5A";
          var ticket_category = "";

          var buyer_name = "Anton Akentiev";
          var buying_date = "12.02.2017";

          tempContract.new(
               date_created,
               price_kop,
               is_paper_ticket,
               event_title,
               event_place_title,
               event_date,
               event_place_address,
               row,
               seat,
               ticket_category,
               buyer_name,
               buying_date,

               {
                    from: creator, 
                    gas: 3000000, 
                    data: bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         assert.equal(err, null);

                         contractAddress = result.contractAddress;
                         contract = web3.eth.contract(abi).at(contractAddress);

                         console.log('Contract address: ');
                         console.log(contractAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

/*
describe('Contract', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];

               done();
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Ticket contract',function(done){
          deployContract1(function(err){
               assert.equal(err,null);

               done();
          });
     });
});
*/
