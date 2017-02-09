var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');

var assert = require('assert');

// Get all issued by particular company tickets. Returns array of ticket IDs.
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/get-all-ticket-issued-by-organizer
app.get('/api/v1/organizer/:inn/tickets',function(request,res,next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No shortId');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     winston.info('Asking tickets for INN: ' + inn);

     var arr = [];
     res.json(arr);
});

// Create new blank ticket to reserve it.
// Postcondition: blank ticket has been created.
// This method is blocking.
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/create-a-new-ticket
app.post('/api/v1/organizer/:inn/tickets',function(request, res, next){
     if(typeof(request.params.inn)==='undefined'){
          winston.error('No shortId');
          return next();
     }
     var inn = request.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }
     winston.info('Adding ticket for INN: ' + inn);

     var id = 0;
     var number = 0;

     // TODO: add to DB

     winston.info('Added ticket: ' + id + '; serial_number= ' + number);
     res.json({ 
          id: id, 
          serial_number: number 
     });
});


// Get a ticket by ID or SERIAL_NUMBER. 
// This method is blocking.
//
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/get-a-ticket
app.get('/api/v1/organizer/:inn/tickets/:id_or_number',function(request,res,next){
     // TODO
     next();
});

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
     // TODO
     next();
});

// Cancel a ticket
// 
// http://docs.ticketchain.apiary.io/#reference/0/tickets-collection/cancel-a-ticket
app.post('/api/v1/organizer/:inn/tickets/:id/cancel',function(request, res, next){
     // TODO
     next();
});

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
     // TODO
     next();
});


// Get batch
// Will return all tickets that have been created in a single batch.
// 
// http://docs.ticketchain.apiary.io/#reference/0/batch-collection/get-batch
app.get('/api/v1/organizer/:inn/batch/:id',function(request, res, next){
     // TODO

     next();
});

