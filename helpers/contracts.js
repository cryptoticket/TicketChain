var solc = require('solc');
var Web3 = require('web3');
var fs = require('fs');

// TODO:
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8989"));

var g_creator = 0;
var g_abi;
var g_bytecode;

function getAccounts(cb){
     web3.eth.getAccounts(function(err, accounts) {
          if(err) {
               cb(err);
               return;
          }

          g_creator = accounts[0];
          cb(null);
     });
}

function compileTicket(cb){
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

     var row = "12";
     var seat = "5A";
     var ticket_category = "";

     var buyer_name = "Anton Akentiev";
     var buying_date = 100;

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

/////////////////
exports.getAccount = getAccounts;
exports.compileTicket = compileTicket;

exports.deployTicket = deployTicket;
