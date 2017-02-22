var server = require('../server.js');
var db = require('../db.js');
var db_helpers = require('../helpers/db_helpers.js');
var config = require('../config.js');

var fs = require('fs');
var http = require('http');
var assert = require('assert');
var restler = require('restler');
var knox  = require('knox');

var JOB_1_ID = 0;
var BATCH_1_ID = 0;
var BATCH_3_ID = 0;

var JOB_2_ID = 0;
var JOB_3_ID = 0;

var INN = '1234567890';

eval(fs.readFileSync('test/helpers.js')+'');

function callFileProcessing(fileName,cb){
     fs.stat(fileName, function(err, stats) {
          assert.equal(err,null);
          assert.notEqual(stats.size,0);

          var isBlocking = '?blocking=1';
          var url = 'http://localhost:9091/api/v1/organizers/' + INN + '/csv_job' + isBlocking;

          restler.post(url, {
               multipart: true,
               data: {
                    "method": "post",
                    "file": restler.file(fileName, null, stats.size, null, "text/csv"),
               },

               //'headers':{
               //     'Authorization':'Bearer ' + globalToken,
               //     'Content-Length': stats.size,
                    //'Content-Type': 'application/json',
               //     'Content-Type':'multipart/form-data; boundary=48940923NODERESLTER3890457293'
               //}
          }).on("complete", function(data) {
               //console.log('-->UPLOAD RESP: ');
               //console.log(data);

               assert.notEqual(data.fileName.length,0);
               assert.notEqual(data.job_id,0);

               var jobID = data.job_id;

               var fname = data.fileName;
               var fpath = './files/' + fname;
          
               assert.equal(fs.existsSync(fpath),true);
               fs.unlinkSync(fpath);

               cb(null,jobID);
          });
     });
}

describe('Files module 1',function(){
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

     it('should create ticket with custom sernumber', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var data = { 
               serial_number: 'АА000000'
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

     it('should upload and process CSV file',function(done){
          // will create single blank ticket with sernum АА123456
          var fileName = 'test/data/blank.csv';
          callFileProcessing(fileName,function(err,jobId){
               assert.equal(err,null);
               assert.notEqual(jobId,0);

               JOB_1_ID = jobId;

               done();
          });
     });

     it('should get file job info', function(done){
          var url = '/api/v1/organizers/' + INN + '/csv_job/' + JOB_1_ID;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               console.log('DO: ');
               console.log(dataOut);

               var p = JSON.parse(dataOut);
               //assert.equal(p.status,'created');
               assert.equal(p.status,'ready');
               assert.notEqual(typeof(p.batch_id),'undefined');
               assert.notEqual(p.batch_id,0);
               assert.equal(p.errors.length,0);
               assert.equal(p.collisions.length,0);

               BATCH_ID_1 = p.batch_id;

               done();
          });
     })

     it('should get blank ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + encodeURIComponent('АА123456');

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.state,'created');

               done();
          });
     })

     it('should get batch that was created by task 1', function(done){
          var url = '/api/v1/organizers/' + INN + '/batches/' + BATCH_ID_1;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,1);

               done();
          });
     })

     it('should upload and process CSV file 2',function(done){
          // will sell ticket with sernum АА123456
          var fileName = 'test/data/one.csv';
          callFileProcessing(fileName,function(err,jobId){
               assert.equal(err,null);
               assert.notEqual(jobId,0);

               JOB_2_ID = jobId;

               done();
          });
     });

     it('should get update info for ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + encodeURIComponent('АА123456');

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.state,'sold');

               //console.log('DO: ');
               //console.log(dataOut);

               assert.equal(p.price_rub, 120);
               assert.equal(p.is_paper_ticket, true);
               assert.equal(p.issuer, 'TicketsCloud');
               assert.equal(p.issuer_inn, '2346787891');
               assert.equal(p.event_title, 'Алиса в стране чудес');
               assert.equal(p.event_place_title, 'МХАТ им Чехова');
               // TODO:
               //assert.equal(p.event_date, '');

               assert.equal(p.row, '12');
               assert.equal(p.seat, '5А');
               assert.equal(p.ticket_category, 1);
               assert.equal(p.seller, 'Касса');
               assert.equal(p.buyer_name, 'Акентьев Антон Андреевич');

               // TODO:
               //assert.equal(p.buying_date, '');
               //assert.equal(p.cancelled_date, '');
               assert.equal(p.organizer_inn,'1234567890');

               done();
          });
     })

     it('should upload and process CSV file 3 with collision',function(done){
          // collision АА123456
          var fileName = 'test/data/two.csv';
          callFileProcessing(fileName,function(err,jobId){
               assert.equal(err,null);
               assert.notEqual(jobId,0);

               JOB_3_ID = jobId;

               done();
          });
     });

     it('should get file job #3 info - collision should be detected', function(done){
          var url = '/api/v1/organizers/' + INN + '/csv_job/' + JOB_3_ID;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.status,'ready');
               assert.notEqual(typeof(p.batch_id),'undefined');
               assert.notEqual(p.batch_id,0);
               assert.equal(p.errors.length,0);
               assert.equal(p.collisions.length,1);
               assert.equal(p.collisions[0],'АА123456');

               BATCH_ID_3 = p.batch_id;

               done();
          });
     })

     it('should get batch that was created by task 3', function(done){
          var url = '/api/v1/organizers/' + INN + '/batches/' + BATCH_ID_3;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.length,0);

               done();
          });
     })
});


describe('Files module 2',function(){
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

     it('should create ticket with custom sernumber', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets';

          var data = { 
               serial_number: 'АА123456'
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

     it('should upload and process CSV file',function(done){
          // will create single blank ticket with sernum АА123456
          var fileName = 'test/data/cancel.csv';
          callFileProcessing(fileName,function(err,jobId){
               assert.equal(err,null);
               assert.notEqual(jobId,0);

               JOB_1_ID = jobId;

               done();
          });
     });

     it('should get file job info', function(done){
          var url = '/api/v1/organizers/' + INN + '/csv_job/' + JOB_1_ID;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               console.log('DO: ');
               console.log(dataOut);

               var p = JSON.parse(dataOut);
               //assert.equal(p.status,'created');
               assert.equal(p.status,'ready');
               assert.notEqual(typeof(p.batch_id),'undefined');
               assert.notEqual(p.batch_id,0);
               assert.equal(p.errors.length,0);
               assert.equal(p.collisions.length,0);

               BATCH_ID_1 = p.batch_id;

               done();
          });
     })

     it('should get blank ticket', function(done){
          var url = '/api/v1/organizers/' + INN + '/tickets/' + encodeURIComponent('АА123456');

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               var p = JSON.parse(dataOut);
               assert.equal(p.state,'cancelled');

               done();
          });
     })
});
