var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');

var assert = require('assert');

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

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
     winston.info('Asking tickets for INN: ' + inn);

     getOrganizerByInn(inn,function(err,orgFound,org){
          if(err){return next(err);}
          if(!orgFound){return next();}

          db.TicketModel.find({organizer:org._id},function(err,tickets){
               if(err){
                    return next(err);
               }

               console.log('Found tickets: ' + tickets.length);

               var arr = [];

               for(var i=0; i<tickets.length; ++i){
                    arr.push(tickets[i]._id);
               }

               res.json(arr);
          });
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

     createNewBlankTicket(inn,sernum,function(err,ticket,isCollision){
          if(err){
               return next(err);
          }
          if(isCollision){
               return res.send(409,'Serial number already exists');
          }
          
          winston.info('Added ticket: ' + ticket._id + '; serial_number= ' + ticket.serial_number);

          res.json({ 
               id: ticket._id, 
               serial_number: ticket.serial_number
          });
     });
});


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

function getTicketByNumber(num,request,res,next){
     winston.info('Getting ticket by num: ' + num);
     db.TicketModel.find({serial_number:num},function(err,tickets){
          if(err){
               return next(err);
          }

          return convertTicketToOut(tickets[0],request,res,next);
     });
}

function getTicketById(id,request,res,next){
     winston.info('Getting ticket by ID: ' + id);
     db.TicketModel.find({_id:id},function(err,tickets){
          if(err){
               return next(err);
          }
          
          return convertTicketToOut(tickets[0],request,res,next);
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
     winston.info('Sell tickets ' + id + ' for INN: ' + inn);

     getOrganizerByInn(inn,function(err,orgFound,org){
          if(err){return next(err);}
          if(!orgFound){return next();}

          db.TicketModel.find({organizer:org._id, _id:id},function(err,tickets){
               if(err){
                    return next(err);
               }
               if(!tickets || !tickets.length){
                    winston.info('Ticket not found: ' + id);
                    return next();
               }

               var ticket = tickets[0];

               fromDataToTicket(ticket,request,function(err,ticketOut){
                    if(err){
                         return next(err);
                    }

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
          winston.error('Bad id_or_number provided');
          return next();
     }
     winston.info('Sell tickets ' + id + ' for INN: ' + inn);

     getOrganizerByInn(inn,function(err,orgFound,org){
          if(err){return next(err);}
          if(!orgFound){return next();}

          db.TicketModel.find({organizer:org._id, _id:id},function(err,tickets){
               if(err){
                    return next(err);
               }
               if(!tickets || !tickets.length){
                    winston.info('Ticket not found: ' + id);
                    return next();
               }

               var ticket = tickets[0];

               // created->sold
               if(state==1){
                    if(ticket.state!=0){
                         winston.info('Ticket state is BAD: ' + ticket.state);
                         return next();
                    }

                    ticket.state = 1;
                    ticket.buying_date = Date.now();
               }else if(state==2){
                    // created or sold -> cancelled
                    ticket.state = 2;
                    ticket.cancelled_date = Date.now();
               }else if(state==2){
               }

               ticket.save(function(err){
                    if(err){
                         return next(err);
                    }

                    // Good!
                    res.json({});
               });
          });
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
     if(typeof(request.body.number_of_tickets)==='undefined'){
          winston.error('No number_of_tickets provided');
          return next();
     }
     var n = request.body.number_of_tickets;
     
     createOrganizer(inn,function(err,id){
          if(err){
               return cb(err);
          }

          // create batch:
          var batch = new db.BatchModel();
          batch.organizer = id;
          batch.tickets = [];

          batch.save(function(err){
               if(err){
                    return next(err);
               }

               addNewTicketToBatch(batch,inn,n,request,res,next);
          });
     });
});

function addNewTicketToBatch(batch,inn,n,request,res,next){
     if(!n){
          // end recursion
          return res.json({batch_id: batch._id});
     }

     // update
     var emptySernum = '';
     createNewBlankTicket(inn,emptySernum,function(err,ticket,isCollision){
          if(err){
               winston.info('Can not create new ticket');
               return next(err);
          }
          if(isCollision){
               return res.send(409,'Serial number already exists');
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
               addNewTicketToBatch(batch,inn,n - 1, request,res,next);
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

     getOrganizerByInn(inn,function(err,orgFound,org){
          if(err){return next(err);}
          if(!orgFound){return next();}

          db.BatchModel.find({organizer:org._id, _id:id},function(err,batches){
               if(err){
                    return next(err);
               }

               if(!batches || !batches.length){
                    winston.info('Batch not found');
                    return next();
               }

               var out = [];
               var batch = batches[0];
               for(var i=0; i<batch.tickets.length; ++i){
                    out.push(batch.tickets[i].ticketId);
               }

               res.json(out);
          });
     });
});

function createNewBlankTicket(inn,optionalSerNum,cb){
     createOrganizer(inn,function(err,id){
          if(err){
               return cb(err);
          }

          var ticket = new db.TicketModel();

          ticket.state = 0;

          if(optionalSerNum.length){
               // TODO: check for collisions
               // and return 409
               ticket.serial_number = optionalSerNum;
          }else{
               // TODO: make unique!!!
               // collisions possible
               ticket.serial_number = helpers.generateSn();
          }

          // TODO: 
          checkIfUniqueSerNum(ticket.serial_number,function(err,isUnique){
               if(err){
                    return cb(err);
               }
               if(!isUnique){
                    return cb(null,null,true);
               }

               ticket.created = Date.now();

               ticket.organizer = id;
               ticket.save(function(err){
                    cb(err,ticket);
               });
          });
     });
}

function convertTicketToOut(t,request,res,next){
     var out = {
          id: t._id,
          serial_number: t.serial_number,
          state: 'created',

          price_rub: t.priceRub,
          is_paper_ticket: t.isPaperTicket,

          issuer: t.issuer,
          issuer_inn: t.issuer_inn,
          issuer_orgn: t.issuer_orgn,
          issuer_ogrnip: t.issuer_ogrnip,
          issuer_address: t.issuer_address,

          event_title: t.event_title,
          event_place_title: t.event_place_title,
          event_date: t.event_date,
          event_place_address: t.event_place_address,

          row: t.row,
          seat: t.seat,
          
          ticket_category: t.ticket_category,

          seller: t.seller,
          seller_inn: t.seller_inn,
          seller_orgn: t.seller_orgn,
          seller_ogrnip: t.seller_ogrnip,
          seller_address: t.seller_address,

          buyer_name: t.buyer_name,
          buying_date: t.buying_date,
          cancelled_date: t.cancelled_date
     };

     if(t.state==1){
          out.state = 'sold';
     }else if(t.state==2){
          out.state = 'cancelled';
     }

     getOrganizerById(t.organizer,function(err,org){
          if(err){
               return next(err);
          }

          convertOrgToOut(out,org);
          res.json(out);
     });
}

function fromDataToTicket(ticket,request,cb){
     copyField(ticket,request.body,'priceRub');
     copyField(ticket,request.body,'isPaperTicket');
     copyField(ticket,request.body,'issuer');
     copyField(ticket,request.body,'issuer_inn');
     copyField(ticket,request.body,'issuer_orgn');
     copyField(ticket,request.body,'issuer_ogrnip');
     copyField(ticket,request.body,'issuer_address');
     copyField(ticket,request.body,'event_title');
     copyField(ticket,request.body,'event_place_title');
     // TODO: date
     //copyField(ticket,request.body,'event_date');
     copyField(ticket,request.body,'event_place_address');
     copyField(ticket,request.body,'row');
     copyField(ticket,request.body,'seat');
     copyField(ticket,request.body,'ticket_category');

     //copyField(ticket,request.body,'organizer');

     copyField(ticket,request.body,'seller');
     copyField(ticket,request.body,'seller_inn');
     copyField(ticket,request.body,'seller_orgn');
     copyField(ticket,request.body,'seller_ogrnip');
     copyField(ticket,request.body,'seller_address');
     copyField(ticket,request.body,'buyer_name');
     
     // TODO: date
     //copyField(ticket,request.body,'buying_date');
     //copyField(ticket,request.body,'cancelled_date');
     
     updateOrganizer(ticket.organizer,request.body,function(err){
          return cb(err,ticket);
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
app.get('/api/v1/organizers',function(request,res,next){
     db.OrganizerModel.find({},function(err,orgs){
          if(err){
               return next(err);
          }

          if(!orgs || !orgs.length){
               winston.info('Can not find organizers');
               return next();
          }

          var out = [];
          for(var i=0; i<orgs.length; ++i){
               //convertOrgToOut(o,orgs[i]);
               out.push(orgs[i].organizer_inn); 
          }
          res.json(out);
     });
});

// Get organizer by INN
//
// http://docs.ticketchain.apiary.io/#reference/0/organizers-collection/get-organizer
app.get('/api/v1/organizers/:inn',function(request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No INN');
          return next();
     }
     var inn = request.params.inn;

     getOrganizerByInn(inn,function(err,isFound,org){
          if(err){
               return next(err);
          }
          if(!isFound){
               return next();
          }

          var out = {};
          convertOrgToOut(out,org);
          res.json(out);
     });
});

// Update organizer by INN 
//
// http://docs.ticketchain.apiary.io/#reference/0/organizers-collection/update-an-organizer
app.put('/api/v1/organizers/:inn',function(request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No INN');
          return next();
     }
     var inn = request.params.inn;

     getOrganizerByInn(inn,function(err,isFound,org){
          if(err){
               return next(err);
          }
          if(!isFound){
               return next();
          }

          updateOrganizer(org,request.body,function(err){
               if(err){
                    return next(err);
               }
               res.json({});
          });
     });
});

function getOrganizerByInn(inn,cb){
     db.OrganizerModel.find({organizer_inn:inn},function(err,orgs){
          if(err){
               return cb(err,false);
          }

          if(!orgs || !orgs.length){
               return cb(null,false,{});
          }
          
          return cb(null,true,orgs[0]);
     });
}


function getOrganizerById(id,cb){
     db.OrganizerModel.find({_id:id},function(err,orgs){
          if(err){
               return cb(err);
          }

          if(!orgs || !orgs.length){
               return cb(new Error('Can not find organizer'));
          }
          
          return cb(null,orgs[0]);
     });
}

function createOrganizer(inn,cb){
     // 1 - find org
     db.OrganizerModel.find({organizer_inn:inn},function(err,orgs){
          if(err){
               return cb(err);
          }

          if(orgs && orgs.length){
               return cb(null,orgs[0]._id);
          }

          // 2 - if not found - create
          var org = new db.OrganizerModel();
          org.organizer_inn = inn;

          org.save(function(err){
               cb(err,org._id);
          });
     });
}

function updateOrganizer(orgId,from,cb){
     getOrganizerById(orgId,function(err,org){
          if(err){return cb(err);}
          
          // WARNING: can't be changed
          //copyField(ticket,from,'organizer_inn');
          copyField(org,from,'organizer');
          copyField(org,from,'organizer_orgn');
          copyField(org,from,'organizer_ogrnip');
          copyField(org,from,'organizer_address');

          org.save(function(err){
               return cb(err);
          });
     });
}

function convertOrgToOut(to,from){
     copyField(to,from,'organizer');
     copyField(to,from,'organizer_inn');
     copyField(to,from,'organizer_orgn');
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

     // Russian lang is truncated (28 instead of 33 letters)
     //var a = [28,28,10,10,10,10,10,10];
     var a = [10,10,10,10,10,10,10,10];
     var p = [7,6,5,4,3,2,1,0];

     var out = 0;

     for(var i=0; i<2; ++i){
          var letterPosS = helpers.getLetterPos(strs[i]);
          var letterPosE = helpers.getLetterPos(stre[i]);

          if(letterPosS===-1){
               winston.error('Bad symbol: ' + strs[i]);
               return next();
          }
          if(letterPosE===-1){
               winston.error('Bad symbol: ' + stre[i]);
               return next();
          }

          var diff = letterPosE - letterPosS;

          var m = diff * Math.pow(a[i],p[i]);
          out = out + m;
     }

     for(var i=2; i<8; ++i){
          var diff = (stre[i] - strs[i]);
          var m = diff * Math.pow(a[i],p[i]);
          out = out + m;
     }

     res.json({count:out});
});

function getDiffSeries(s,e){
     return 0;
}

function getDiffNumbers(s,e){
     // TODO: abs, swap
     return e - s;
}

// TODO: optimize it! Will be very slow soon...
function checkIfUniqueSerNum(sn,cb){
     db.TicketModel.find({serial_number:sn},function(err,tickets){
          if(err){
               return cb(err);
          }
          if(tickets && tickets.length){
               return cb(null,false);
          }

          return cb(null,true);
     });
}
