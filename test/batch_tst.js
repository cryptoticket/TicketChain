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

describe('Batch module',function(){
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
               end_number: '000000',
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

     it('should create batch 2', function(done){
          var url = '/api/v1/organizers/' + INN + '/batches';

          // 100 ticket
          var data = { 
               start_series: 'АА',
               start_number: '000001',
               end_series: 'АА',
               end_number: '000100',
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

     it('should get batch 2', function(done){
          var url = '/api/v1/organizers/' + INN + '/batches/' + batchOneId;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,100);

               ticketOneId = p[0];
               done();
          });
     })

     it('should get ticket from batch 2', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + ticketOneId;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.state,"created");
               assert.equal(p.serial_number,"АА000001");

               done();
          });
     })
});

