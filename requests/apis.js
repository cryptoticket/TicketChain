var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

function stateToQuery(s){
     if(s==0){return 0;}
     if(s==1){return 1;}
     if(s==2){return 2;}

     if(s=='created'){return 0;}
     if(s=='sold'){return 1;}
     if(s=='cancelled'){return 2;}

     return -1;
}

//var BigNumber = require('bignumber.js');
//var unit = new BigNumber(Math.pow(10,18));

// Get total ticket count for current organizer
//
// http://docs.ticketchain.apiary.io/#reference/0/tickets/get-ticket-count
/*
app.get('/api/v1/organizers/:inn/ticket_count',function(request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     winston.info('Asking ticket_count for INN: ' + inn);

     var out = {
          count: 0 
     };

     out.count = contract_helpers.getTicketCountForOrganizer(inn);
     return res.json(out);
});
*/
app.get('/api/v1/organizers/:inn/ticket_count',function(request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     winston.info('Asking ticket_count for INN: ' + inn);

     var query = {organizer_inn:inn};
     if(typeof(request.query.state)!=='undefined'){
          query.state = stateToQuery(request.query.state);
     }
     
     // This method uses DB
     db.TicketModel.find(query).count(function(err,count){
          if(err){return next(err);}

          var out = {
               count: count
          };

          return res.json(out);
     });
});

app.get('/api/v1/organizers/:inn/stats',function(request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No INN');
          return next();
     }
     var inn = request.params.inn;

     var out = {
          totalTickets: 0,
          blank: 0,
          sold: 0,
          cancelled: 0
     };
     
     // This method uses DB
     db.TicketModel.find({organizer_inn:inn, state:0},function(err,tickets){
          if(err){
               return next(err);
          }

          console.log('Found blank tickets: ' + tickets.length);
          out.blank = tickets.length;

          db.TicketModel.find({organizer_inn:inn, state: 1},function(err,tickets2){
               if(err){
                    return next(err);
               }

               console.log('Found sold tickets: ' + tickets2.length);
               out.sold = tickets2.length;

               db.TicketModel.find({organizer_inn:inn, state: 2},function(err,tickets3){
                    if(err){
                         return next(err);
                    }

                    console.log('Found cancelled tickets: ' + tickets3.length);
                    out.cancelled = tickets3.length;

                    out.totalTickets = out.blank + out.sold + out.cancelled;
                    res.json(out);
               });
          });
     });
});


// Get all issued by particular company tickets. Returns array of ticket IDs.
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/get-all-ticket-issued-by-organizer
app.get('/api/v1/organizers/:inn/tickets',function(request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     winston.info('Asking tickets for INN: ' + inn + ' page=' + request.query.page + ' limit= ' + request.query.limit);

     var query = {organizer_inn:inn};
     if(typeof(request.query.state)!=='undefined' && (request.query.state) && (request.query.state!=='undefined')){
          query.state = stateToQuery(request.query.state);
     }
     
     db.TicketModel.paginate(query,{
          sort:{serial_number:1},
          page:request.query.page,
          limit:request.query.limit},

     function(err,tickets){
          if(err){
               return next(err);
          }

          console.log('Found tickets: ' + tickets.docs.length);

          var arr = [];

          for(var i=0; i<tickets.docs.length; ++i){
               arr.push(tickets.docs[i]._id);
          }

          res.json(arr);
     });
});


// Create new blank ticket to reserve it.
// Postcondition: blank ticket has been created.
// This method is blocking.
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/create-a-new-ticket
app.post('/api/v1/organizers/:inn/tickets',function(request, res, next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     winston.info('Adding ticket for INN: ' + inn);

     var sernum = '';
     if(typeof(request.body.serial_number)!=='undefined'){
          sernum = request.body.serial_number;
          if(!helpers.validateSernum(sernum)){
               winston.error('Bad sernum: ' + sernum);
               return next();
          }
     }

     winston.info('Adding ticket for INN: ' + inn);
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     
     newBlankTicket(inn,sernum,function(err,isCollision,ticket){
          if(err){return next(err);}

          if(isCollision){
               return res.status(409).json({collision:sernum});
          }

          res.json({ 
               id: ticket._id, 
               serial_number: ticket.serial_number
          });
     });
});

function newBlankTicket(inn,sernum,cb){
     createNewBlankTicket(inn,sernum,function(err,ticket,isCollision){
          if(err){
               return cb(err);
          }
          if(isCollision){
               return cb(null,true);
          }
          
          winston.info('Added ticket: ' + ticket._id + '; serial_number= ' + ticket.serial_number);
          return cb(null,false,ticket);     
     });
}


// Get a ticket by ID or SERIAL_NUMBER. 
// This method is blocking.
//
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/get-a-ticket
app.get('/api/v1/organizers/:inn/tickets/:id_or_number',function(request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }

     if(typeof(request.params.id_or_number)==='undefined'){
          winston.error('No id_or_number provided');
          return next();
     }
     var id_or_number= request.params.id_or_number;
     if(!id_or_number || !id_or_number.length){
          winston.error('Bad id_or_number provided');
          return next();
     }

     winston.info('INN is: ' + inn);

     //var len = Buffer.byteLength(s, 'utf8');
     if(id_or_number.length==8){
          return getTicketByNumber(id_or_number,request,res,next);
     }else{
          return getTicketById(id_or_number,request,res,next);
     }
});

/*
function getTicketByNumber(num,request,res,next){
     contract_helpers.getTicketByNumber(num,function(err,ticket){
          if(err){
               return next(err);
          }
          if(!ticket){
               winston.info('Ledger. Can not get ticket: ' + id);
               return next();
          }

          return convertTicketToOut(ticket,request,res,next);
     });
}

function getTicketById(id,request,res,next){
     winston.info('Getting ticket by ID: ' + id);
     
     contract_helpers.getTicketById('' + id,function(err,ticket){
          if(err){
               return next(err);
          }
          if(!ticket){
               winston.info('Ledger. Can not get ticket: ' + id);
               return next();
          }

          return convertTicketToOut(ticket,request,res,next);
     });
}
*/

// This is copied from 'requests/apis_no_smart_contracts.js'
function getTicketByNumber(num,request,res,next){
     winston.info('Getting ticket by num: ' + num);
     db.TicketModel.findOne({serial_number:num},function(err,ticket){
          if(err){
               return next(err);
          }
          if(!ticket){
               return next();
          }

          return convertTicketToOut(ticket,request,res,next);
     });
}

function getTicketById(id,request,res,next){
     winston.info('Getting ticket by ID: ' + id);
     db.TicketModel.findOne({_id:id},function(err,ticket){
          if(err){
               return next(err);
          }
          
          return convertTicketToOut(ticket,request,res,next);
     });
}

// Edit a ticket
//
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/edit-a-ticket
app.put('/api/v1/organizers/:inn/tickets/:id',function(request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     if(typeof(request.params.id)==='undefined'){
          winston.error('No id provided');
          return next();
     }
     var id = request.params.id;
     if(!id || !id.length){
          winston.error('Bad id_or_number provided');
          return next();
     }
     winston.info('Edit ticket ' + id + ' for INN: ' + inn);

     db.TicketModel.findOne({organizer_inn:inn, _id:id},function(err,ticket){
          if(err){
               return next(err);
          }
          if(typeof(ticket)=='undefined' || !ticket){
               winston.info('Ticket not found: ' + id);
               return next();
          }

          db_helpers.fromDataToTicket(ticket,request.body,function(err,ticketOut){
               if(err){
                    return next(err);
               }

               console.log('Contract ID: ');
               console.log(ticket._id);

               contract_helpers.updateContract('' + ticket._id,request.body,function(err){
                    if(err){
                         // will not save data to DB...
                         return next(err);
                    }

                    // TODO: if contract is updated, but DB will fail... -> problems
                    ticketOut.save(function(err){
                         if(err){
                              return next(err);
                         }

                         res.json({});
                    });
               });
          });
     });
});

// Sell a ticket
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/sell-a-ticket
app.post('/api/v1/organizers/:inn/tickets/:id/sell',function(request, res, next){
     changeStateTo(1,request,res,next);
});

// Cancel a ticket
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/cancel-a-ticket
app.post('/api/v1/organizers/:inn/tickets/:id/cancel',function(request, res, next){
     changeStateTo(2,request,res,next);
});

function changeStateTo(state,request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     if(typeof(request.params.id)==='undefined'){
          winston.error('No id provided');
          return next();
     }
     var id = request.params.id;
     if(!id || !id.length){
          winston.error('Bad id provided');
          return next();
     }
     winston.info('Sell tickets ' + id + ' for INN: ' + inn);

     changeStateInternal(request,inn,id,state,function(err){
          if(err){
               return next(err);
          }

          // Good!
          res.json({});
     });
}

function changeStateInternal(request,inn,id,state,cb){
     // 1 - update ticket in DB
     db.TicketModel.findOne({organizer_inn:inn, _id:id},function(err,ticket){
          if(err){
               return cb(err);
          }
          if(typeof(ticket)=='undefined' || !ticket){
               winston.info('Ticket not found: ' + id);
               return cb(new Error('No ticket found: ' + id));
          }

          // created->sold
          if(state==1){
               if(ticket.state!==0){
                    winston.info('Ticket state is BAD: ' + ticket.state);
                    return cb(new Error('Ticket in bad state: ' + id));
               }

               ticket.state = 1;
               ticket.buying_date = Date.now();
          }else if(state==2){
               // created or sold -> cancelled
               ticket.state = 2;
               ticket.cancelled_date = Date.now();
          }

          if(!request){
               ticket.save(function(err){
                    if(err){
                         return cb(err);
                    }

                    cb(null);
               });
          }else{
               db_helpers.fromDataToTicket(ticket,request.body,function(err,ticketOut){
                    if(err){
                         return cb(err);
                    }

                    // 2 - update contract 
                    contract_helpers.updateContractWithState('' + ticket._id,request.body,state,function(err){
                         if(err){
                              return cb(err);
                         }

                         ticketOut.save(function(err){
                              if(err){
                                   return cb(err);
                              }

                              cb(null);
                         });
                    });
               });
          }
     });
}

///////// BATCH:
// Create multiple new blank tickets to reserve them. 
// Returns batch ID. 
// 
// Postcondition: 
//   1) blank tickets have been created
//   2) batch has been created
// 
// http://docs.ticketchain.apiary.io/#reference/0/batch-collection/create-new-batch
app.post('/api/v1/organizers/:inn/batches',function(request, res, next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;

     if(typeof(request.body)==='undefined' || request.body===null){
          return next();
     } 
     if(typeof(request.body.start_series)==='undefined'){
          winston.error('No start_series provided');
          return next();
     }
     if(typeof(request.body.start_number)==='undefined'){
          winston.error('No start_number provided');
          return next();
     }
     if(typeof(request.body.end_series)==='undefined'){
          winston.error('No end_series provided');
          return next();
     }
     if(typeof(request.body.end_number)==='undefined'){
          winston.error('No end_number provided');
          return next();
     }

     var ss = request.body.start_series;
     ss = ss.toUpperCase();
     var es = request.body.end_series;
     es = es.toUpperCase();

     var sn = request.body.start_number;
     var en = request.body.end_number;
     
     // TODO: check 
     if(ss.length!==2){
          winston.error('Start series is bad');
          return next();
     }
     if(es.length!==2){
          winston.error('End series is bad');
          return next();
     }
     if(sn.length!==6){
          winston.error('Start number is bad');
          return next();
     }
     if(en.length!==6){
          winston.error('End number is bad');
          return next();
     }

     var strs = '' + ss + sn;
     var stre = '' + es + en;
     var n = calculateCount(strs,stre);
     
     // create batch:
     var batch = new db.BatchModel();
     //batch.organizer = orgId;
     batch.organizer_inn = inn;
     batch.tickets = [];

     batch.save(function(err){
          if(err){
               return next(err);
          }

          var strs = '' + ss + sn;
          addNewTicketToBatch(batch/*,orgId*/,inn,n,strs,request,res,next);
     });
});

// Create multiple new blank tickets to reserve them. 
// Returns batch ID. 
// 
// Postcondition: 
//   1) blank tickets have been created
//   2) batch has been created
// 
// http://docs.ticketchain.apiary.io/#reference/0/batches/create-new-batch-with-ticket-count-only
// TODO: write tests
app.post('/api/v1/organizers/:inn/batches_with_count',function(request, res, next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;

     if(typeof(request.body)==='undefined' || request.body===null){
          return next();
     } 
     if(typeof(request.body.start_series)==='undefined'){
          winston.error('No start_series provided');
          return next();
     }
     if(typeof(request.body.start_number)==='undefined'){
          winston.error('No start_number provided');
          return next();
     }
     if(typeof(request.body.count)==='undefined'){
          winston.error('No count provided');
          return next();
     }

     var ss = request.body.start_series;
     ss = ss.toUpperCase();
     var sn = request.body.start_number;
     
     // TODO: check 
     if(ss.length!==2){
          winston.error('Start series is bad');
          return next();
     }
     if(sn.length!==6){
          winston.error('Start number is bad');
          return next();
     }

     var strs = '' + ss + sn;
     //var n = calculateCount(strs,stre);
     var n = request.body.count;
     
     // create batch:
     var batch = new db.BatchModel();
     //batch.organizer = orgId;
     batch.organizer_inn = inn;
     batch.tickets = [];

     batch.save(function(err){
          if(err){
               return next(err);
          }

          var strs = '' + ss + sn;
          addNewTicketToBatch(batch/*,orgId*/,inn,n,strs,request,res,next);
     });
});

function addNewTicketToBatch(batch,inn,n,strs,request,res,next){
     if(!n){
          // end recursion
          return res.json({batch_id: batch._id});
     }

     // update
     createNewBlankTicket(inn,strs,function(err,ticket,isCollision){
          if(err){
               winston.info('Can not create new ticket');
               return next(err);
          }
          if(isCollision){
               return res.status(409).json({collision:strs});
          }

          // add ticket to batch
          batch.tickets.push({ticketId: ticket._id});
          
          // TODO: perf is lost here
          // save on each iteration
          batch.save(function(err){
               if(err){
                    winston.info('Can not save batch');
                    return next(err);
               }

               // continue recursion 
               strs = helpers.incrementSerialNumber(strs);
               addNewTicketToBatch(batch,inn,n - 1, strs,request,res,next);
          });
     });
}

// Get batch
// Will return all tickets that have been created in a single batch.
// 
// http://docs.ticketchain.apiary.io/#reference/0/batch-collection/get-batch
app.get('/api/v1/organizers/:inn/batches/:id',function(request, res, next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     if(typeof(request.params.id)==='undefined'){
          winston.error('No id provided');
          return next();
     }
     var id = request.params.id;
     if(!id || !id.length){
          winston.error('Bad id_or_number provided');
          return next();
     }
     winston.info('Get batch ' + id + ' for INN: ' + inn);

     db.BatchModel.findOne({organizer_inn:inn, _id:id},function(err,batch){
          if(err){
               return next(err);
          }

          if(typeof(batch)=='undefined'|| !batch){
               winston.info('Batch not found');
               return next();
          }

          var out = [];
          for(var i=0; i<batch.tickets.length; ++i){
               out.push(batch.tickets[i].ticketId);
          }

          winston.info('Returning data for batch: ' + id);
          res.json(out);
     });
});

function createNewBlankTicket(inn,optionalSerNum,cb){
     var ticket = new db.TicketModel();

     ticket.state = 0;

     if(optionalSerNum.length){
          if(optionalSerNum.length!=8){
               return cb(new Error('Bad custom ser num: ' + optionalSerNum));
          }

          ticket.serial_number = optionalSerNum;
     }else{
          // TODO: make unique!!!
          // collisions possible
          ticket.serial_number = helpers.generateSn();
     }

     checkIfUniqueSerNum(ticket.serial_number,function(err,isUnique){
          if(err){
               return cb(err);
          }
          if(!isUnique){
               return cb(null,null,true);
          }

          ticket.created = Date.now();
          ticket.organizer_inn = inn; 

          //ticket.organizer = organizerId;

          winston.info('Deploying new ticket to Blockchain');
          contract_helpers.deployTicket(ticket,function(err,txHash){
               if(err){
                    winston.error('Can not deploy new ticket');
                    return cb(err);
               }

               winston.info('TX hash: ' + txHash);

               ticket.tx_hash = txHash;

               winston.info('Saving new Ticket: ' + ticket.serial_number);
               ticket.save(function(err){
                    cb(err,ticket);
               });
          });
     });
}

/*
function convertTicketToOut(t,request,res,next){
     var out = {
          id: t.id(),
          serial_number: t.serial_number(),
          state: 'created',

          price_kop: t.price_kop(),

          is_paper_ticket: t.is_paper_ticket(),

          issuer: t.issuer(),
          issuer_inn: t.issuer_inn(),
          issuer_ogrn: t.issuer_ogrn(),
          issuer_ogrnip: t.issuer_ogrnip(),
          issuer_address: t.issuer_address(),

          event_title: t.event_title(),
          event_place_title: t.event_place_title(),
          event_date: t.event_date(),
          event_place_address: t.event_place_address(),

          row: t.row(),
          seat: t.seat(),
          
          ticket_category: t.ticket_category(),

          organizer: t.organizer(),
          organizer_inn: t.organizer_inn(),
          organizer_ogrn: t.organizer_ogrn(),
          organizer_ogrnip: t.organizer_ogrnip(),
          organizer_address: t.organizer_address(),

          seller: t.seller(),
          seller_inn: t.seller_inn(),
          seller_ogrn: t.seller_ogrn(),
          seller_ogrnip: t.seller_ogrnip(),
          seller_address: t.seller_address(),

          buyer_name: t.buyer_name(),
          buying_date: t.buying_date(),
          cancelled_date: t.cancelled_date(),

          contract_address: ''
     };

     if(t.currentState()==1){
          out.state = 'sold';
     }else if(t.currentState()==2){
          out.state = 'cancelled';
     }

     contract_helpers.getTicketAddressById(t.id(),function(err,address){
          out.contract_address = address;

          res.json(out);
     });
}
*/

// This is copied from 'requests/apis_no_smart_contracts.js'
function convertTicketToOut(t,request,res,next){
     var out = {
          id: t.id,
          serial_number: t.serial_number,
          state: 'created',

          price_kop: t.price_kop,

          is_paper_ticket: t.is_paper_ticket,

          issuer: t.issuer,
          issuer_inn: t.issuer_inn,
          issuer_ogrn: t.issuer_ogrn,
          issuer_ogrnip: t.issuer_ogrnip,
          issuer_address: t.issuer_address,

          event_title: t.event_title,
          event_place_title: t.event_place_title,
          event_date: t.event_date,
          event_place_address: t.event_place_address,

          row: t.row,
          seat: t.seat,
          
          ticket_category: t.ticket_category,

          organizer: t.organizer,
          organizer_inn: t.organizer_inn,
          organizer_ogrn: t.organizer_ogrn,
          organizer_ogrnip: t.organizer_ogrnip,
          organizer_address: t.organizer_address,

          seller: t.seller,
          seller_inn: t.seller_inn,
          seller_ogrn: t.seller_ogrn,
          seller_ogrnip: t.seller_ogrnip,
          seller_address: t.seller_address,

          buyer_name: t.buyer_name,
          buying_date: t.buying_date,
          cancelled_date: t.cancelled_date,

          contract_address: 0  
     };

     if(t.state==1){
          out.state = 'sold';
     }else if(t.state==2){
          out.state = 'cancelled';
     }

     if(typeof(out.event_date)=='undefined'){
          out.event_date = 0;
     }
     if(typeof(out.buying_date)=='undefined'){
          out.buying_date = 0;
     }
     if(typeof(out.cancelled_date)=='undefined'){
          out.cancelled_date = 0;
     }

     // TODO: this call is very slow...
     contract_helpers.getTicketAddressById('' + t.id,function(err,address){
          out.contract_address = address;

          res.json(out);
     });
}


function copyField(to,from,field){
     if(field in from){
          to[field] = from[field];
     }
}

// Get all organizers
//
// http://docs.ticketchain.apiary.io/#reference/0/organizers-collection/get-all-organizers
/*
app.get('/api/v1/organizers',function(request,res,next){
     var out = contract_helpers.getAllOrganizerInns();
     res.json(out);
});
*/

// This is copied from 'requests/apis_no_smart_contracts.js'
app.get('/api/v1/organizers',function(request,res,next){
     // This method uses DB
     db.TicketModel.distinct('organizer_inn',function(err,orgs){
          if(err){
               return next(err);
          }

          if(!orgs || !orgs.length){
               winston.info('Can not find organizers');
               return next();
          }

          res.json(orgs);
     });
});

function convertOrgToOut(to,from){
     copyField(to,from,'organizer');
     copyField(to,from,'organizer_inn');
     copyField(to,from,'organizer_ogrn');
     copyField(to,from,'organizer_ogrnip');
     copyField(to,from,'organizer_address');
}

// 
app.post('/api/v1/organizers/:inn/calculate_ticket_count',function(request, res, next){
     // do not check for INN parameter
     if(typeof(request.body)==='undefined' || request.body===null){
          return next();
     } 
     if(typeof(request.body.start_series)==='undefined'){
          winston.error('No start_series provided');
          return next();
     }
     if(typeof(request.body.start_number)==='undefined'){
          winston.error('No start_number provided');
          return next();
     }
     if(typeof(request.body.end_series)==='undefined'){
          winston.error('No end_series provided');
          return next();
     }
     if(typeof(request.body.end_number)==='undefined'){
          winston.error('No end_number provided');
          return next();
     }

     var ss = request.body.start_series;
     ss = ss.toUpperCase();
     var es = request.body.end_series;
     es = es.toUpperCase();

     var sn = request.body.start_number;
     var en = request.body.end_number;
     
     // TODO: check 
     if(ss.length!==2){
          winston.error('Start series is bad');
          return next();
     }
     if(es.length!==2){
          winston.error('End series is bad');
          return next();
     }
     if(sn.length!==6){
          winston.error('Start number is bad');
          return next();
     }
     if(en.length!==6){
          winston.error('End number is bad');
          return next();
     }

     var strs = '' + ss + sn;
     var stre = '' + es + en;

     var out = calculateCount(strs,stre);
     res.json({count:out});
});

function calculateCount(strs,stre){
     // Russian lang is truncated (28 instead of 33 letters)
     var out = 0;

     // 1 letter 
     var letter1PosS = helpers.getLetterPos(strs[0]);
     var letter1PosE = helpers.getLetterPos(stre[0]);

     var letter2PosS = helpers.getLetterPos(strs[1]);
     var letter2PosE = helpers.getLetterPos(stre[1]);

     //console.log('E1: ' + letter1PosE);
     //console.log('E2: ' + letter2PosE);

     var start = (letter1PosS * 28) + letter2PosS;
     var end = (letter1PosE * 28) + letter2PosE;

     var variation = (end - start) * 1000000;

     var num1 = Number(strs.substring(2,8));
     var num2 = Number(stre.substring(2,8));

     return variation + (num2 - num1 + 1);
}

// TODO: optimize it! Will be very slow soon...
function checkIfUniqueSerNum(sn,cb){
     db.TicketModel.findOne({serial_number:sn},function(err,ticket){
          if(err){
               return cb(err);
          }
          if(typeof(ticket)!=='undefined' && ticket){
               return cb(null,false);
          }

          return cb(null,true);
     });
}


// TODO: add tests
app.get('/api/v1/info',function(request,res,next){
     var enabled = (typeof(process.env.ETH_NODE)!=='undefined');

     var out = {
          eth_is_enabled: enabled,
          eth_node: process.env.ETH_NODE,

          eth_main_address: contract_helpers.g_ledgerAddress,
          eth_main_address_link: contract_helpers.getMainAddressLink(),

          eth_main_account: contract_helpers.getMainAccount(),
          eth_main_account_link: contract_helpers.getMainAccountLink(),

          eth_balance_wei: contract_helpers.getBalance(contract_helpers.getMainAccount())
     };

     return res.json(out);
});

