var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');

var assert = require('assert');

// Get all issued by particular company tickets. Returns array of ticket IDs.
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/get-all-ticket-issued-by-organizer
app.get('/api/v1/organizer/:inn/tickets',function(request,res,next){
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

     db.TicketModel.find({issuer_inn:inn},function(err,tickets){
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

// Create new blank ticket to reserve it.
// Postcondition: blank ticket has been created.
// This method is blocking.
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/create-a-new-ticket
app.post('/api/v1/organizer/:inn/tickets',function(request, res, next){
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

     createNewBlankTicket(inn,function(err,ticket){
          if(err){
               return next(err);
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
app.get('/api/v1/organizer/:inn/tickets/:id_or_number',function(request,res,next){
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
     if(id_or_number.length==10){
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

function convertTicketToOut(t,request,res,next){
     var out = {
          id: t._id,
          serial_number: t.serial_number,
          state: 'created'
     };

     if(t.state==1){
          out.state = 'sold';
     }else if(t.state==2){
          out.state = 'cancelled';
     }

     res.json(out);
}

// Edit a ticket
//
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/edit-a-ticket
app.put('/api/v1/organizer/:inn/tickets/:id',function(request,res,next){
     // TODO
     next();
});

// Sell a ticket
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/sell-a-ticket
app.post('/api/v1/organizer/:inn/tickets/:id/sell',function(request, res, next){
     changeStateTo(1,request,res,next);
});

// Cancel a ticket
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/cancel-a-ticket
app.post('/api/v1/organizer/:inn/tickets/:id/cancel',function(request, res, next){
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

     db.TicketModel.find({issuer_inn:inn, _id:id},function(err,tickets){
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
          }else if(state==2){
               // created or sold -> cancelled
               ticket.state = 2;
          }

          ticket.save(function(err){
               if(err){
                    return next(err);
               }
               res.send(200);
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
app.post('/api/v1/organizer/:inn/batch',function(request, res, next){
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
     
     // create batch:
     var batch = new db.BatchModel();
     batch.organizer_inn = inn;
     batch.tickets = [];

     batch.save(function(err){
          if(err){
               return next(err);
          }

          addNewTicketToBatch(batch,inn,n,request,res,next);
     });
});

function addNewTicketToBatch(batch,inn,n,request,res,next){
     if(!n){
          // end recursion
          return res.json({batch_id: batch._id});
     }

     // update
     createNewBlankTicket(inn,function(err,ticket){
          if(err){
               winston.info('Can not create new ticket');
               return next(err);
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
               addNewTicketToBatch(batch,n - 1, request,res,next);
          });
     });
}

// Get batch
// Will return all tickets that have been created in a single batch.
// 
// http://docs.ticketchain.apiary.io/#reference/0/batch-collection/get-batch
app.get('/api/v1/organizer/:inn/batch/:id',function(request, res, next){
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

     db.BatchModel.find({organizer_inn:inn, _id:id},function(err,batches){
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

function createNewBlankTicket(inn,cb){
     var ticket = new db.TicketModel();

     ticket.state = 0;
     // TODO: change
     ticket.serial_number = 'AB12345678';
     ticket.issuer_inn = inn;
     ticket.created = Date.now();

     ticket.save(function(err){
          cb(err,ticket);
     });
}
