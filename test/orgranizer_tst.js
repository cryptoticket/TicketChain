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
          var INN = '1234567890';
          var url = '/api/v1/organizer/' + INN + '/tickets';

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
          var INN = '1234567890';
          var url = '/api/v1/organizer/' + INN + '/tickets';

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
          var INN = '1234567890';
          var url = '/api/v1/organizer/' + INN + '/tickets';

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
          var INN = '1234567891';
          var url = '/api/v1/organizer/' + INN + '/tickets/' + ticketOneId;

          console.log('Asking for ticket by ID: ' + ticketOneId);

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);

               assert.notEqual(p.serial_number.length,0);
               assert.notEqual(p.id.length,0);
               // TODO: check format

               ticketOneSerialNumber = p.serial_number;
               done();
          });
     })

     it('should get ticket by SERIAL NUMBER', function(done){
          var INN = '1234567891';
          var url = '/api/v1/organizer/' + INN + '/tickets/' + ticketOneSerialNumber;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               ticketOneSerialNumber = p.serial_number;

               // TODO: check format

               done();
          });
     })

     it('should not get tickets if INN is bad', function(done){
          var INN = '123456789';
          var url = '/api/v1/organizer/' + INN + '/tickets';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,404);
               done();
          });
     })

     it('should not get tickets for other INN', function(done){
          var INN = '1234567891';
          var url = '/api/v1/organizer/' + INN + '/tickets';

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,0);

               done();
          });
     })

     it('should not create ticket if bad INN', function(done){
          var INN = '123456789';
          var url = '/api/v1/organizer/' + INN + '/tickets';

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
});
