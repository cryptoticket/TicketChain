var solc = require('solc');
var Web3 = require('web3');
var fs = require('fs');
var winston = require('winston');
var sleep = require('sleep');

var helpers = require('../helpers/helpers.js');
var db_helpers = require('../helpers/db_helpers.js');

var config = require('../config');
var enabled = (process.env.ETH_CONNECT || config.get('ethereum:connect'));

var web3 = new Web3(new Web3.providers.HttpProvider(
     process.env.ETH_NODE || config.get('ethereum:test_node')));

var g_creator = 0;
var g_abi;
var g_abiTicket;

var g_bytecode;
var g_ledgerAddress = (process.env.ETH_MAIN_ADDRESS || config.get('ehtereum:main_contract_address'));
var g_ledger = 0;

function getContractAbi(contractName,cb){
     var file = './contracts/Ticket.sol';

     fs.readFile(file, function(err, result){
          if(err){
               return cb(err);
          }

          var source = result.toString();
          var output = solc.compile(source, 1); // 1 activates the optimiser
          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          return cb(null,abi,bytecode);
     });
}

function getAccounts(cb){
     if(!enabled){
          return cb(null);
     }

     web3.eth.getAccounts(function(err, accounts) {
          if(err) {
               cb(err);
               return;
          }

          g_creator = accounts[0];

          console.log('CREATOR: ' + g_creator);
          cb(null);
     });
}

function compileContracts(cb){
     if(!enabled){
          return cb(null);
     }

     var ledgerContractName = ':TicketLedger';
     getContractAbi(ledgerContractName,function(err,abi,bytecode){
          if(err){return cb(err);}

          g_abi = abi;
          g_bytecode = bytecode;

          var ticketContractName = ':Ticket';
          getContractAbi(ticketContractName,function(err,abi,bytecode){
               if(err){return cb(err);}

               g_abiTicket = abi;

               if(!g_ledgerAddress || !g_ledgerAddress.length){
                    winston.info('Deploying new main contract...');

                    deployMain(function(err,address){
                         if(err){return cb(err);}
                         
                         g_ledgerAddress = address;
                         g_ledger = web3.eth.contract(g_abi).at(g_ledgerAddress);

                         winston.info('New main contract deployed...');
                         return cb(null);
                    });
               }else{
                    g_ledger = web3.eth.contract(g_abi).at(g_ledgerAddress);
                    return cb(null);
               }
          });
     });
}

function deployMain(cb){
     if(!enabled){
          return cb(null);
     }

     var alreadyCalled = false;

     var tempContract = web3.eth.contract(g_abi);
     tempContract.new(
          {
               from: g_creator, 
               gas: 6000000, 
               data: g_bytecode
          }, 
          function(err, c){
               if(err){return cb(err);}

               web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                    if(err){return cb(err);}

                    if(!alreadyCalled){
                         alreadyCalled = true;

                         return cb(null,result.contractAddress);
                    }
               });
          });
}

function deployTicket(ticket,cb){
     if(!enabled){
          return cb(null,0);
     }
     if(!ticket.organizer_inn || !helpers.validateInn(ticket.organizer_inn)){
          return cb(new Error('Bad organizer_inn during deploy'));
     }

     var alreadyCalled = false;
     g_ledger.issueNewTicket(
          ticket.organizer_inn,
          ticket.serial_number,
          {
               from: g_creator,               
               gasPrice: 2000000,
               gas: 3000000
          },function(err,result){
               if(err){
                    return cb(err);
               }

               console.log('Result: ');
               console.log(result);

               web3.eth.getTransactionReceipt(result, function(err, r2){
                    if(err){
                         return cb(err);
                    }

                    var address = g_ledger.getTicket(g_ledger.currentTicketCount - 1);
                    cb(null,address);
               });
          }
     );
}

function copyOrganizer(ticket,contract,cb){
     contract.setOrganizer(
               (ticket.organizer || contract.issuer), 
               (ticket.organizer_inn || contract.issuer_inn),
               (ticket.organizer_orgn || contract.issuer_orgn),
               (ticket.organizer_ogrnip || contract.issuer_ogrnip),
               (ticket.organizer_address || contract.issuer_address),
          {
               from: g_creator,               
               gasPrice: 2000000,
               gas: 3000000
          },function(err,result){
               if(err){return cb(err);}

               web3.eth.getTransactionReceipt(result, function(err, r){
                    winston.info('Organizer transaction info: ' + r.transactionHash);
                    cb(err);
               });
          }
     );
}

function copyIssuer(ticket,contract,cb){
     contract.setSeller(
               (ticket.issuer || contract.issuer), 
               (ticket.issuer_inn || contract.issuer_inn),
               (ticket.issuer_orgn || contract.issuer_orgn),
               (ticket.issuer_ogrnip || contract.issuer_ogrnip),
               (ticket.issuer_address || contract.issuer_address),
          {
               from: g_creator,               
               gasPrice: 2000000,
               gas: 3000000
          },function(err,result){
               if(err){return cb(err);}

               web3.eth.getTransactionReceipt(result, function(err, r){
                    winston.info('Issuer transaction info: ' + r.transactionHash);
                    cb(err);
               });
          }
     );
}

function copySeller(ticket,contract,cb){
     contract.setSeller(
               (ticket.seller || contract.seller), 
               (ticket.seller_inn || contract.seller_inn),
               (ticket.seller_orgn || contract.seller_orgn),
               (ticket.seller_ogrnip || contract.seller_ogrnip),
               (ticket.seller_address || contract.seller_address),
          {
               from: g_creator,               
               gasPrice: 2000000,
               gas: 3000000
          },function(err,result){
               if(err){return cb(err);}

               web3.eth.getTransactionReceipt(result, function(err, r){
                    winston.info('Seller transaction info: ' + r.transactionHash);
                    cb(err);
               });
          }
     );
}

function updateContract(contractAddress,body,cb){
     if(!enabled){
          return cb(null);
     }

     winston.info('Updating contract: ' + contractAddress);
     var contract = web3.eth.contract(g_abiTicket).at(contractAddress);

     // 1 - Convert data
     var placeholder = {};
     db_helpers.fromDataToTicket(placeholder,body,function(err,out){
          if(err){
               return cb(err);
          }

          // 2 - Convert organizer
          var placeholder2 = {};
          db_helpers.fromDataToOrganizer(placeholder2,body,function(err,out2){
               if(err){
                    return cb(err);
               }
     
               copySeller(out,contract,function(err){
                    copyOrganizer(out2,contract,function(err){
                         copyIssuer(out,contract,function(err){
                              return cb(null);
                         });
                    });
               });
          });
     });
}

function waitForTransaction(txHash,cb){
     return waitForTransactionInt(0,txHash,cb); 
}

function waitForTransactionInt(indexTry,txHash,cb){
     if(indexTry>20){
          return cb(new Error('Can not get tx receipt: ' + txHash));
     }

     // poll
     web3.eth.getTransactionReceipt(txHash, function(err, result){
          if(err){
               return cb(err);
          }

          if(result){
               // stop recursion
               return cb(null,result);
          }

          sleep.sleep(3);

          // recurse
          console.log('Try again for tx: ' + txHash);

          waitForTransactionInt(indexTry + 1,txHash,cb);
     });
}

/////////////////
exports.getAccount = getAccounts;
exports.compileContracts = compileContracts;

exports.deployTicket = deployTicket;
exports.updateContract = updateContract;

exports.waitForTransaction = waitForTransaction;
