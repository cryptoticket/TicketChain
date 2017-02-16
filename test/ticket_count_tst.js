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