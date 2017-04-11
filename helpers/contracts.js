var solc = require('solc');
var Web3 = require('web3');
var fs = require('fs');
var winston = require('winston');
var sleep = require('sleep');

var helpers = require('../helpers/helpers.js');
var db_helpers = require('../helpers/db_helpers.js');

var config = require('../config');

// You must set this ENV VAR before
var enabled = (typeof(process.env.ETH_NODE)!=='undefined');
var web3 = null;
if(enabled){
     web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));
}

var g_creator = 0;
var g_abi;
var g_abiTicket;

var g_bytecode;
var g_ledgerAddress = process.env.ETH_MAIN_ADDRESS;
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
               gas: 4995000,
               data: g_bytecode
          }, 
          function(err, c){
               if(err){return cb(err);}

               // must wait here until TX is mined!
               // TODO: can fail if still not
               waitForTransaction(c.transactionHash,function(err,result){
                    if(err){return cb(err);}

                    if(!alreadyCalled){
                         alreadyCalled = true;

                         return cb(null,result.contractAddress);
                    }
               });
          });
}

// IN: ticket object
// OUT: TX hash
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
          '' + ticket._id,
          {
               from: g_creator,               
               gas: 2900000 
          },function(err,result){
               if(err){
                    return cb(err);
               }

               winston.info('Issued new contract: ' + ticket.serial_number + ' with TX hash: ' + result);

               // TX will be mined later
               return cb(null,result);
          }
     );
}

function copyOrganizer(ticket,contract,cb){
     contract.setOrganizer(
               (ticket.organizer || contract.organizer()), 
               contract.getOrganizerInn(),
               //(ticket.organizer_inn || contract.organizer_inn),
               (ticket.organizer_ogrn || contract.organizer_ogrn()),
               (ticket.organizer_ogrnip || contract.organizer_ogrnip()),
               (ticket.organizer_address || contract.organizer_address()),
          {
               from: g_creator,               
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
     contract.setIssuer(
               (ticket.issuer || contract.issuer()), 
               (ticket.issuer_inn || contract.issuer_inn()),
               (ticket.issuer_ogrn || contract.issuer_ogrn()),
               (ticket.issuer_ogrnip || contract.issuer_ogrnip()),
               (ticket.issuer_address || contract.issuer_address()),
          {
               from: g_creator,               
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

function copyData(ticket,contract,cb){
     var dateCreated = contract.date_created();
     var dateEvent = contract.event_date();
     var dateBuying = contract.buying_date();
     var dateCancelled = contract.cancelled_date();

     if(ticket.created){
          dateCreated = helpers.dateToUnix(ticket.created);
     }
     if(ticket.event_date){
          dateEvent = helpers.dateToUnix(ticket.event_date);
     }
     if(ticket.buying_date){
          dateBuying = helpers.dateToUnix(ticket.buying_date);
     }
     if(ticket.cancelled_date){
          dateCancelled = helpers.dateToUnix(ticket.cancelled_date);
     }

     contract.setData(
               dateCreated,

               (ticket.price_kop || contract.price_kop()),
               (ticket.is_paper_ticket || contract.is_paper_ticket()),
               (ticket.event_title || contract.event_title()),
               (ticket.event_place_title || contract.event_place_title()),

               dateEvent,

               (ticket.event_place_address || contract.event_place_address()),

               (ticket.row || contract.row()),
               (ticket.seat|| contract.seat()),
               (ticket.ticket_category || contract.ticket_category()),

               (ticket.buyer_name || contract.buyer_name()),

               dateBuying,
               dateCancelled,
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

function copySeller(ticket,contract,cb){
     contract.setSeller(
               (ticket.seller || contract.seller()), 
               (ticket.seller_inn || contract.seller_inn()),
               (ticket.seller_orgn || contract.seller_ogrn()),
               (ticket.seller_ogrnip || contract.seller_ogrnip()),
               (ticket.seller_address || contract.seller_address()),
          {
               from: g_creator,               
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

function updateContract(ticketId,body,cb){
     if(!enabled){
          return cb(null);
     }

     getTicketById(ticketId,function(err,contract,contractAddr){
          if(err){
               return cb(err);
          }
          if(!contract){
               return cb(new Error('Contract is not mined yet'));
          }

          winston.info('Updating ticket: ' + ticketId);
          winston.info('Contract address: ' + contractAddr);

          // 1 - Convert data
          var placeholder = {};
          db_helpers.fromDataToTicket(placeholder,body,function(err,out){
               if(err){
                    return cb(err);
               }

               // 2 - Convert organizer
               db_helpers.fromDataToOrganizer(out,body,function(err,out2){
                    if(err){
                         return cb(err);
                    }
                    
                    copyData(out2,contract,function(err){
                         copySeller(out2,contract,function(err){
                              copyOrganizer(out2,contract,function(err){
                                   copyIssuer(out2,contract,function(err){
                                        return cb(null);
                                   });
                              });
                         });
                    });
               });
          });
     });
}

function updateContractWithState(ticketId,body,state,cb){
     if(!enabled){
          return cb(null);
     }
     
     getTicketById(ticketId,function(err,contract){
          if(err){
               return cb(err);
          }
          if(!contract){
               return cb(new Error('Contract is not mined yet'));
          }

          winston.info('Updating contract with state: ' + ticketId);

          var currentDate = Date.now();

          contract.setState(
               state,
               currentDate,
               {
                    from: g_creator,               
                    gas: 3000000
               },function(err,result){
                    if(err){return cb(err);}

                    web3.eth.getTransactionReceipt(result, function(err, r){
                         winston.info('Seller transaction info: ' + r.transactionHash);

                         if(err){
                              return cb(err);
                         }
                         updateContract(ticketId,body,cb);
                    });
               }
          );
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
          winston.info('Trying again for tx: ' + txHash);
          waitForTransactionInt(indexTry + 1,txHash,cb);
     });
}

// This may take a lot of time, but costs no gas...
function getAllOrganizerInns(){
     if(!enabled){
          winston.info('ETH connect is disabled. Please set ETH_NODE var');
          return [];
     }

     var count = g_ledger.getTicketCount();
     
     var allInns = {};
     for(var i=0; i<count; ++i){
          var addr = g_ledger.getTicket(i);
          var t = web3.eth.contract(g_abiTicket).at(addr);

          var inn = t.getOrganizerInn();
          allInns[inn] = 1;
     }

     var out = [];
     for(k in allInns){
          out.push(k);
     }

     return out;
}

function getTicketCountForOrganizer(inn){
     if(!enabled){
          winston.info('ETH connect is disabled. Please set ETH_NODE var');
          return [];
     }

     //var count = g_ledger.getTicketCountForInn(inn);
     //return count;
     
     var count = g_ledger.getTicketCount();
     var allInns = {};
     for(var i=0; i<count; ++i){
          var addr = g_ledger.getTicket(i);
          var t = web3.eth.contract(g_abiTicket).at(addr);

          var currentInn = t.getOrganizerInn();

          if(typeof(currentInn)!=='undefined' && currentInn){
               if(currentInn in allInns){
                    allInns[currentInn] = allInns[currentInn] + 1;
               }else{
                    allInns[currentInn] = 1;
               }
          }
     }
     var out = allInns[inn];
     return out;
}

function getTicketByNumber(num,cb){
     if(!enabled){
          winston.info('ETH connect is disabled. Please set ETH_NODE var');
          return cb(null,null);
     }

     var addr = g_ledger.getTicketBySernum(num);
     if(!addr){
          return cb(null,null);
     }
     var t = web3.eth.contract(g_abiTicket).at(addr);
     return cb(null,t,addr);
}

function getTicketById(id,cb){
     if(!enabled){
          winston.info('ETH connect is disabled. Please set ETH_NODE var');
          return cb(null,null);
     }

     var addr = g_ledger.getTicketById(id);
     if(!addr || (addr=='0x0000000000000000000000000000000000000000')){
          return cb(null,null);
     }
     var t = web3.eth.contract(g_abiTicket).at(addr);
     return cb(null,t,addr);
}

function getTicketAddressById(id,cb){
     if(!enabled){
          winston.info('ETH connect is disabled. Please set ETH_NODE var');
          return cb(null,null);
     }

     var addr = g_ledger.getTicketById(id);
     return cb(null,addr);
}

function getMainAddressLink(){
     return process.env.ETH_EXPLORER_ADDRESS_LINK + g_ledgerAddress;
}

function getMainAccount(){
     return g_creator;
}

function getMainAccountLink(){
     return process.env.ETH_EXPLORER_ADDRESS_LINK + g_creator;
}

function getBalance(address){
     if(!address){
          return 0;
     }
     return web3.eth.getBalance(address);
}

/////////////////
exports.getAccount = getAccounts;
exports.compileContracts = compileContracts;

exports.deployTicket = deployTicket;
exports.updateContract = updateContract;
exports.updateContractWithState = updateContractWithState;

exports.getAllOrganizerInns = getAllOrganizerInns;
exports.getTicketCountForOrganizer = getTicketCountForOrganizer;
exports.getTicketByNumber = getTicketByNumber;
exports.getTicketById = getTicketById;
exports.getTicketAddressById = getTicketAddressById;

exports.waitForTransaction = waitForTransaction;

exports.g_ledgerAddress = g_ledgerAddress;

exports.getMainAccount = getMainAccount;
exports.getMainAddressLink = getMainAddressLink;
exports.getMainAccountLink = getMainAccountLink;
exports.getBalance = getBalance;
