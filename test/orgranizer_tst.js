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

var orgOneInn = 0;
var ticketOneId = 0;
var ticketOneSerialNumber = 0;

var INN = '1234567890';
var TEST_SER_NUM = 'АБ123456';

var batchOneId = 0;

function getTicketCount(ss,se,ns,ne,cb){
     var url = '/api/v1/organizers/' + INN + '/calculate_ticket_count';

     var data = { 
          start_series: ss,
          start_number: ns,

          end_series: se,
          end_number: ne
     };
     var postData = JSON.stringify(data);

     var authToken = '';
     postDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
          var p = JSON.parse(dataOut);

          return cb(null,p.count);
     });
}

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
               assert.equal(statusCode,404);
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
               assert.notEqual(p.serial_number,0);

               done();
          });
     })

     it('should get organizers', function(done){
          var url = '/api/v1/organizers';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,1);

               orgOneInn = p[0];
               done();
          });
     })

     it('should get organizer by INN', function(done){
          var url = '/api/v1/organizers/' + orgOneInn;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.organizer_inn,INN);
               done();
          });
     })

     it('should get tickets', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);
               
               console.log('OUT: ');
               console.log(dataOut);

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
               assert.equal(p.organizer_inn,INN);

               // TODO: check format

               ticketOneSerialNumber = p.serial_number;
               done();
          });
     })

     it('should get ticket by SERIAL NUMBER', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + encodeURIComponent(ticketOneSerialNumber);

          console.log('URL: ');
          console.log(url);

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);

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

     it('should edit ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId;

          var data = { 
               issuer_orgn: '1231'
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          putDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               done();
          });
     })

     it('should get updated ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + encodeURIComponent(ticketOneSerialNumber);

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.issuer_orgn,'1231');

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
          var url = '/api/v1/organizers/' + INN + '/tickets/' + encodeURIComponent(ticketOneSerialNumber);

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
          var url = '/api/v1/organizers/' + INN + '/tickets/' + encodeURIComponent(ticketOneSerialNumber);

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

describe('Serial number propagation',function(){
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
               assert.equal(statusCode,404);
               done();
          });
     })

     it('should create ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var data = { 
               serial_number: TEST_SER_NUM
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
               assert.equal(p.serial_number,TEST_SER_NUM);

               done();
          });
     })

     it('should not add ticket with same SER_NUMBER', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var data = { 
               serial_number: TEST_SER_NUM
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          postDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,409);

               done();
          });
     })
})

describe('TicketCount',function(){
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

     it('should get count 0', function(done){
          var ss = 'АА';
          var se = 'АА';
          var ns = '123456';
          var ne = '123456';
     
          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,0);
               done();
          });
     })

     it('should get count 1', function(done){
          var ss = 'ББ';
          var se = 'ББ';
          var ns = '123456';
          var ne = '123457';
     
          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,1);
               done();
          });
     })

     it('should get count 2', function(done){
          var ss = 'АА';
          var se = 'АА';
          var ns = '000000';
          var ne = '000009';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,9);
               done();
          });
     })

     it('should get count 3', function(done){
          var ss = 'АА';
          var se = 'АА';
          var ns = '123456';
          var ne = '123456';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,0);
               done();
          });
     })
     
     it('should get count 4', function(done){
          var ss = 'АА';
          var se = 'АА';
          var ns = '100000';
          var ne = '300000';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,200000);
               done();
          });
     })

     it('should get count 5', function(done){
          var ss = 'ББ';
          var se = 'ББ';
          var ns = '100000';
          var ne = '300009';
     
          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,200009);
               done();
          });
     })

     it('should get count 6', function(done){
          // starting with АА000000
          // ending with АБ000000
          var ss = 'АА';
          var se = 'АБ';
          var ns = '000000';
          var ne = '000000';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,1000000);
               done();
          });
     })

     it('should get count 7', function(done){
          var ss = 'АА';
          var se = 'АЯ';
          var ns = '000000';
          var ne = '000000';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,27000000);
               done();
          });
     })

     it('should get count 8', function(done){
          // starting with АА000000
          // ending with АБ55555

          var ss = 'АА';
          var se = 'АБ';
          var ns = '000000';
          var ne = '555555';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,1555555);
               done();
          });
     })

     it('should get count 9', function(done){
          // starting with АА000000
          // ending with АЯ55555

          var ss = 'АА';
          var se = 'АЯ';
          var ns = '000000';
          var ne = '555555';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,27555555);
               done();
          });
     })
})
