var server = require('../server.js');
var db = require('../db.js');
var db_helpers = require('../helpers/db_helpers.js');
var config = require('../config.js');
var helpers = require('../helpers/helpers.js');

var fs = require('fs');
var http = require('http');
var assert = require('assert');
var restler = require('restler');
var knox  = require('knox');

var jobID = 0;

eval(fs.readFileSync('test/helpers.js')+'');

describe('Files module',function(){
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

     it('should upload CSV',function(done){
          var fileName = 'test/data/one.csv';
          fs.stat(fileName, function(err, stats) {
               assert.equal(err,null);
               assert.notEqual(stats.size,0);

               var isBlocking = '?blocking=1';
               var url = 'http://localhost:9091/api/v1/csv_job' + isBlocking;

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
                    console.log('-->UPLOAD RESP: ');
                    console.log(data);

                    assert.notEqual(data.fileName.length,0);
                    assert.notEqual(data.job_id,0);

                    jobID = data.job_id;

                    ///// 
                    var fname = data.fileName;
                    var fpath = './files/' + fname;
               
                    assert.equal(fs.existsSync(fpath),true);

                    fs.unlinkSync(fpath);
                    done();
               });
          });
     });

     it('should get file job info', function(done){
          var url = '/api/v1/csv_job/' + jobID;

          var authToken = '';
          getData(9091,url,authToken,function(err,statusCode,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               console.log('DO: ');
               console.log(dataOut);

               var p = JSON.parse(dataOut);
               //assert.equal(p.status,'created');
               assert.equal(p.status,'ready');

               done();
          });
     })
});

