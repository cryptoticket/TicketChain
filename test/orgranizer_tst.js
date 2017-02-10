var server = require('../server.js');
var db = require('../db.js');
var db_helpers = require('../helpers/db_helpers.js');
var config = require('../config.js');
var helpers = require('../helpers/helpers.js');

var fs = require('fs');
var http = require('http');
var assert = require('assert');

eval(fs.readFileSync('test/helpers.js')+'');

var signature = '';
var userId = '';
var globalToken = '';

var ticketOneId = 0;
var ticketOneSerialNumber = 0;

var INN = '1234567890';

var batchOneId = 0;

describe('Organizer module',function(){
     before(function(done){
          var uri  = 'mongodb://localhost/tests';

          var conn = db.connectToDb(uri,'','');
          db.removeDb(function(){
               server.initDb(db);

               server.startHttp(9091);
               done();   // ok
          });
     });

     after(function(done){
          server.stop();
          db.removeDb(function(){});
          db.disconnectDb();
          done();
     });

     it('should get no tickets', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,0);

               done();
          });
     })

     it('should create ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var data = { 
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          postDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               //console.log('Data: ');
               //console.log(dataOut);

               var p = JSON.parse(dataOut);
               assert.notEqual(p.id,0);
               assert.notEqual(p.number,0);

               done();
          });
     })

     it('should get tickets', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,1);

               ticketOneId = p[0];

               done();
          });
     })

     it('should get ticket by ID', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId;

          console.log('Asking for ticket by ID: ' + ticketOneId);

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);

               //console.log('O: ');
               //console.log(dataOut);

               assert.notEqual(p.serial_number.length,0);
               assert.notEqual(p.id.length,0);
               // TODO: check format

               ticketOneSerialNumber = p.serial_number;
               done();
          });
     })

     it('should get ticket by SERIAL NUMBER', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneSerialNumber;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               ticketOneSerialNumber = p.serial_number;

               console.log('CCC: ');
               console.log(dataOut);

               // TODO: check format
               assert.notEqual(p.serial_number.length,0);
               assert.equal(p.state,"created");

               done();
          });
     })

     it('should not get tickets if INN is bad', function(done){
          var INN = '123456789';
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,404);
               done();
          });
     })

     it('should not get tickets for other INN', function(done){
          var INN = '123456789';
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,404);

               done();
          });
     })

     it('should not create ticket if bad INN', function(done){
          var INN = '123456789';
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var data = { 
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          postDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,404);
               done();
          });
     })

     it('should sell ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId + '/sell';

          // TODO: can take data here
          var data = { 
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          postDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);
               done();
          });
     })

     it('should not sell ticket again', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId + '/sell';

          var data = { 
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          postDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,404);
               done();
          });
     })

     it('should get updated ticket state', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneSerialNumber;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.state,"sold");

               done();
          });
     })

     it('should cancell ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId + '/cancel';

          var data = { 
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          postDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);
               done();
          });
     })

     it('should get updated ticket state', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneSerialNumber;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.state,"cancelled");

               done();
          });
     })

     it('should allow to cancell ticket again', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId + '/cancel';

          var data = { 
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          postDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);
               done();
          });
     })
});

describe('Batch module',function(){
     before(function(done){
          var uri  = 'mongodb://localhost/tests';

          var conn = db.connectToDb(uri,'','');
          db.removeDb(function(){
               server.initDb(db);

               server.startHttp(9091);
               done();   // ok
          });
     });

     after(function(done){
          server.stop();
          db.removeDb(function(){});
          db.disconnectDb();
          done();
     });

     it('should create batch', function(done){
          var url = '/api/v1/organizers/' + INN + '/batches';

          var data = { 
               number_of_tickets: 1 
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          postDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.notEqual(p.batch_id, 0);
               
               batchOneId = p.batch_id;

               done();
          });
     })

     it('should get batch', function(done){
          var url = '/api/v1/organizers/' + INN + '/batches/' + batchOneId;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,1);

               ticketOneId = p[0];

               done();
          });
     })

     it('should get ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.state,"created");

               done();
          });
     })

});
