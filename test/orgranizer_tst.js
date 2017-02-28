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

describe('Organizer module',function(){
     before(function(done){
          var uri  = 'mongodb://localhost/tests';

          var conn = db.connectToDb(uri,'','');
          db.removeDb(function(){
               server.initDb(db);

               server.startHttp(9091,function(err){
                    done(err);   // ok
               });
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
               
               //console.log('OUT: ');
               //console.log(dataOut);

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

               //console.log('CCC: ');
               //console.log(dataOut);

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
               issuer_ogrn: '1234567890123'
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
               assert.equal(p.issuer_ogrn,'1234567890123');

               assert.equal(typeof(p.event_date),'undefined');
               assert.equal(typeof(p.buying_date),'undefined');
               assert.equal(typeof(p.cancelled_date),'undefined');

               done();
          });
     })

     it('should sell ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId + '/sell';

          // TODO: can take data here
          var data = { 
               buyer_name: "Семин Андрей",
               event_place_address:"Москва Картеный ряд",
               event_place_title:"МХАТ",
               event_title:"Щелкунчик",
               id:"58b04f5a299e2500113cb81b",
               is_paper_ticket:true,
               organizer_inn:"111111111111",
               price_rub:110,
               row:"6",
               seat:"10Б",
               seller:"ООО ОблакоБилетов",
               seller_address:"Москва",
               seller_inn:"123123123123",
               seller_ogrn:"1231231231231",
               seller_ogrnip:"123123123812389",
               serial_number:"АА000001",
               state:"created",
               //ticket_category:"Первая"
               ticket_category:1
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
               assert.equal(statusCode,500);
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
               assert.equal(p.price_rub, 110);

               assert.equal(typeof(p.event_date),'undefined');
               assert.notEqual(typeof(p.buying_date),'undefined');
               assert.equal(typeof(p.cancelled_date),'undefined');

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

               assert.equal(typeof(p.event_date),'undefined');
               assert.notEqual(typeof(p.buying_date),'undefined');
               assert.notEqual(typeof(p.cancelled_date),'undefined');

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

     //////////////////////////
     it('should edit ticket data', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId;

          var data = { 
               event_date: '2017-02-10T15:25:28.508Z' 
          };
          var postData = JSON.stringify(data);

          var authToken = '';
          putDataAuth(9091,url,postData,authToken,function(err,statusCode,headers,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               done();
          });
     })

     it('should get updated ticket with date', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + encodeURIComponent(ticketOneSerialNumber);

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               //console.log('P: ');
               //console.log(p);

               assert.equal(p.event_date,'2017-02-10T15:25:28.508Z');

               done();
          });
     })
});

describe('Pagination module',function(){
     before(function(done){
          var uri  = 'mongodb://localhost/tests';

          var conn = db.connectToDb(uri,'','');
          db.removeDb(function(){
               server.initDb(db);

               server.startHttp(9091,function(err){
                    done(err);   // ok
               });
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

          // only 1 ticket
          var data = { 
               start_series: 'АА',
               start_number: '000000',
               end_series: 'АА',
               end_number: '000123',
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

     it('should get ticket count', function(done){
          var url = '/api/v1/organizers/' + INN + '/ticket_count';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);
               
               //console.log('OUT: ');
               //console.log(dataOut);

               var p = JSON.parse(dataOut);
               assert.equal(p.count,124);

               done();
          });
     });

     it('should get ticket page 1', function(done){
          // default ?page=1&limit=50
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);
               
               //console.log('OUT: ');
               //console.log(dataOut);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,50);

               done();
          });
     });

     it('should get ticket page 2', function(done){
          // default ?page=1&limit=50
          var url = '/api/v1/organizers/' + INN + '/tickets?page=2';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);
               
               //console.log('OUT: ');
               //console.log(dataOut);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,50);

               done();
          });
     });

     it('should get ticket page 3', function(done){
          // default ?page=1&limit=50
          var url = '/api/v1/organizers/' + INN + '/tickets?page=3';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);
               
               //console.log('OUT: ');
               //console.log(dataOut);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,24);

               done();
          });
     });
});
