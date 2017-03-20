var solc = require('solc');
var Web3 = require('web3');

var config = require('../config');
var contract_helpers = require('../helpers/contracts.js');

var web3 = new Web3(new Web3.providers.HttpProvider(
     process.env.ETH_NODE || config.get('ethereum:test_node')));

//var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8989"));
//var web3 = new Web3(new Web3.providers.HttpProvider("http://138.201.89.68:8545"));

var fs = require('fs');
var assert = require('assert');
var BigNumber = require('bignumber.js');

var accounts;
var creator;

var contractLedgerAddress;
var contractLedger;

var contractAddress;
var contract;

// init BigNumber
var unit = new BigNumber(Math.pow(10,18));

function getContractAbi(contractName,cb){
     var file = './contracts/Ticket.sol';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          var output = solc.compile(source, 1); // 1 activates the optimiser
          var abi = JSON.parse(output.contracts[contractName].interface);
          return cb(null,abi);
     });
}

function deployContract1(cb){
     var file = './contracts/Ticket.sol';
     var contractName = ':TicketLedger';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          //console.log('1');
          //var solcV = solc.useVersion('0.4.9+commit.364da425.Emscripten.clang');
          //console.log('2');

          //solc.loadRemoteVersion('latest', function(err, solcSnapshot) {
               assert.equal(err,null);

               var output = solc.compile(source, 0); // 1 activates the optimiser

               //console.log('OUTPUT: ');
               //console.log(output.contracts);

               var abi = JSON.parse(output.contracts[contractName].interface);
               var bytecode = output.contracts[contractName].bytecode;
               var tempContract = web3.eth.contract(abi);

               var alreadyCalled = false;

               //console.log('C: ' + creator);

               tempContract.new(
                    {
                         from: creator, 
                         gas: 4000000,
                         data: '0x' + bytecode
                    }, 
                    function(err, c){
                         assert.equal(err, null);

                         contract_helpers.waitForTransaction(c.transactionHash,function(err,result){
                              assert.equal(err, null);
                              assert.notEqual(result, null);

                              contractLedgerAddress = result.contractAddress;
                              contractLedger = web3.eth.contract(abi).at(contractLedgerAddress);

                              console.log('Ledger contract address: ');
                              console.log(contractLedgerAddress);

                              if(!alreadyCalled){
                                   alreadyCalled = true;

                                   return cb(null);
                              }
                         });
                    });
          //});
     });
}

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

     it('should deploy Ticket Ledger contract',function(done){
          deployContract1(function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should create new Ticket contract',function(done){
          var organizer_inn = "1234567890";
          var serial_number = "АБ123456";

          contractLedger.issueNewTicket(
               organizer_inn,
               serial_number,
               {
                    from: creator,               
                    gasPrice: 2000000,
                    gas: 3000000
               },function(err,result){
                    assert.equal(err,null);

                    console.log('Result: ');
                    console.log(result);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     })

     it('should get Ticket contract address',function(done){
          var contractName = ':Ticket';
          getContractAbi(contractName,function(err,abi){
               assert.equal(err,null);

               contractAddress = contractLedger.getTicket(0);
               console.log('CL: ');
               console.log(contractAddress);

               contract = web3.eth.contract(abi).at(contractAddress);
               done();
          });
     })

     it('should set basic data',function(done){
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
          var buying_date = 100;

          contract.setData(
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
                    gasPrice: 2000000,
                    gas: 3000000
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should set issuer',function(done){
          var issuer = "TicketsCloud";
          var issuer_inn = "1234567890";
          var issuer_orgn = "1234567890123";
          var issuer_ogrnip = "123456789012345";
          var issuer_address = "Moscow";

          contract.setIssuer(
                    issuer,
                    issuer_inn,
                    issuer_orgn,
                    issuer_ogrnip,
                    issuer_address,
               {
                    from: creator,               
                    gasPrice: 2000000,
                    gas: 3000000
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should set seller',function(done){
          var s = "TicketLand";
          var s_inn = "1234567890";
          var s_orgn = "1234567890123";
          var s_ogrnip = "123456789012345";
          var s_address = "Spb";

          contract.setSeller(
                    s,
                    s_inn,
                    s_orgn,
                    s_ogrnip,
                    s_address,
               {
                    from: creator,               
                    gasPrice: 2000000,
                    gas: 3000000
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should set organizer',function(done){
          var o = "МХАТ";
          var o_inn = "1234567890";
          var o_orgn = "1234567890123";
          var o_ogrnip = "123456789012345";
          var o_address = "Москва";

          contract.setOrganizer(
                    o,
                    o_inn,
                    o_orgn,
                    o_ogrnip,
                    o_address,
               {
                    from: creator,               
                    gasPrice: 2000000,
                    gas: 3000000
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r){
                         assert.equal(err, null);

                         //console.log('Result: ');
                         //console.log(r);

                         done();
                    });
               }
          );
     });

     it('should get organizers INN back',function(done){
          var inn = contract.getOrganizerInn();

          console.log('Result: ');
          console.log(inn);

          assert.equal(inn,'1234567890'); 
          done();
     });

     it('should get state back',function(done){
          var s = contract.getState();

          //console.log('Result: ');
          //console.log(s);

          assert.equal(s,0); 
          done();
     });
});
