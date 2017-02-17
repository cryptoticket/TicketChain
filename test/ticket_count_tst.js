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
               assert.equal(count,1);
               done();
          });
     })

     it('should get count 1', function(done){
          var ss = 'ББ';
          var se = 'ББ';
          var ns = '123456';
          var ne = '123457';
     
          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,2);
               done();
          });
     })

     it('should get count 2', function(done){
          var ss = 'АА';
          var se = 'АА';
          var ns = '000000';
          var ne = '000009';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,10);
               done();
          });
     })

     it('should get count 3', function(done){
          var ss = 'АА';
          var se = 'АА';
          var ns = '123456';
          var ne = '123456';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,1);
               done();
          });
     })
     
     it('should get count 4', function(done){
          var ss = 'АА';
          var se = 'АА';
          var ns = '100000';
          var ne = '300000';

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,200001);
               done();
          });
     })

     it('should get count 5', function(done){
          var ss = 'ББ';
          var se = 'ББ';
          var ns = '100000';
          var ne = '300009';
     
          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,200010);
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
          
          // 1 million of items:
          // АА000000
          // ...
          // АА999999
          //
          // + 1 last
          // АБ000000

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,1000001);
               done();
          });
     })

     it('should get count 7', function(done){
          var ss = 'АА';
          var se = 'АВ';
          var ns = '000000';
          var ne = '000000';

          // 1 million of items:
          // АА000000
          // ...
          // АА999999
          //

          // 1 million of items:
          // АБ000000
          // ...
          // АБ999999

          // 1 million of items:
          // АВ000000
          // ...
          // АВ999999

          //... 
          // 1 last: АВ000000

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,2000001);
               done();
          });
     })

     it('should get count 7', function(done){
          var ss = 'АА';
          var se = 'АЯ';
          var ns = '000000';
          var ne = '000000';

          // 1 million of items:
          // АА000000
          // ...
          // АА999999
          //

          // 1 million of items:
          // АБ000000
          // ...
          // АБ999999

          //... 
          // 1 last: АЯ000000

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,27000001);
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
               assert.equal(count,1555556);
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
               assert.equal(count,27555556);
               done();
          });
     })

     it('should get count 10', function(done){
          // starting with АА000000
          // ending with АЯ55555

          var ss = 'АА';
          // 10 = 28
          var se = 'БА';
          var ns = '000000';
          var ne = '000000';

          // 28 millions
          // АА
          // АБ
          // АВ
          // АГ
          // ..
          // АЯ000000
          // АЯ999999
          //
          // + a last БА000000

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,28000001);
               done();
          });
     })

     it('should get count 11', function(done){
          // 0 0
          var ss = 'АА';
          // 3 0 
          var se = 'ГА';

          var ns = '000000';
          var ne = '000000';

          // 3x:
          // 28 millions
          // АА
          // АЯ
          // ..

          // 28 
          // БА
          // БЯ

          // 28 
          // ВА
          // ВЯ

          // 1 last million 
          // ГА000000
          // ГА999999

          // 3 * 28 = 84 

          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,84000001);
               done();
          });
     })

     it('should get count 12', function(done){
          // 00 
          var ss = 'АА';
          // 27.27
          var se = 'ЯЯ';
          var ns = '000000';
          var ne = '999999';
     
          // 28x:
          // 
          // 28
          // АА
          // АБ
          // АВ
          // ..

          // 28
          // БА
          // ББ
          // БВ
          // ..

          // 28 
          // ЯА
          // ЯБ
          // ЯВ
          // ЯГ
          // ЯД
          // ..

          // 1 last million
          // ЯЯ000000
          // ЯЯ999999

          // TODO: fix that...
          // 28 x 28 = 784 + 00000
          getTicketCount(ss,se,ns,ne,function(err,count){
               assert.equal(count,784000000);
               done();
          });
     })
})
