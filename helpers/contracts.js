var solc = require('solc');
var Web3 = require('web3');
var fs = require('fs');
var winston = require('winston');
var db_helpers = require('../helpers/db_helpers.js');

var config = require('../config');

var enabled = (process.env.ETH_CONNECT || config.get('ethereum:connect'));

var web3 = new Web3(new Web3.providers.HttpProvider(
     process.env.ETH_NODE || config.get('ethereum:test_node')));

var g_creator = 0;
var g_abi;
var g_bytecode;

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

function compileTicket(cb){
     if(!enabled){
          return cb(null);
     }

     var file = './contracts/Ticket.sol';
     // TODO: fix it!
     var contractName = ':Ticket';

     fs.readFile(file, function(err, result){
          if(err){
               return cb(err);
          }

          var source = result.toString();
          var output = solc.compile(source, 1); // 1 activates the optimiser

          g_abi = JSON.parse(output.contracts[contractName].interface);
          g_bytecode = output.contracts[contractName].bytecode;

          return cb(null);
     });
}

function deployTicket(ticket,cb){
     if(!enabled){
          return cb(null,0);
     }

     var tempContract = web3.eth.contract(g_abi);
     var alreadyCalled = false;

     // Params:
     var date_created = 0;
     var price_kop = 100;
     var is_paper_ticket = false;
     var event_title = "";
     var event_place_title = "";
     var event_date = "";
     var event_place_address = "";
     var row = "";
     var seat = "";
     var ticket_category = "";
     var buyer_name = "";
     var buying_date = 0;

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
               from: g_creator, 
               gas: 3000000, 
               data: g_bytecode
          }, 
          function(err, c){
               if(err){
                    return cb(err);
               }

               web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                    if(err){
                         return cb(err);
                    }

                    var contractAddress = result.contractAddress;
                    //var contract = web3.eth.contract(g_abi).at(contractAddress);

                    if(!alreadyCalled){
                         alreadyCalled = true;

                         return cb(null,contractAddress);
                    }
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

     // TODO: get contract address

     winston.info('--> Updating contract: ' + contractAddress);
     var contract = web3.eth.contract(g_abi).at(contractAddress);

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

/////////////////
exports.getAccount = getAccounts;
exports.compileTicket = compileTicket;

exports.deployTicket = deployTicket;
exports.updateContract = updateContract;
