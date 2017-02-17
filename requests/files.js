var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');

var assert = require('assert');
var knox  = require('knox');

app.post('/api/v1/csv_job',function(req, res, next) {
     winston.info('POST File');

     var fstream;

     req.pipe(req.busboy);

     // TODO:
     // 0- filter file size!

     // 1- get file to temp dir
     winston.info('Upload started');

     req.busboy.on('file', function (fieldname, file, filename) {
          var generatedFileName = helpers.generateFileName();

          winston.info('Got file: ' + filename + ' -> ' + generatedFileName); 

          fstream = fs.createWriteStream(__dirname + '/files/' + generatedFileName);
          file.pipe(fstream);

          fstream.on('close', function () {
               var out = {
                    fileName: generatedFileName,
                    job_id: 1           // TODO 
               };
               res.json(out);
          });
     });

});

app.get('/api/v1/csv_job/:job_id',function(req, res, next) {
     // TODO  

     // TODO:
     var out = {
          // 0 - created
          // 1 - processing
          // 2 - ready
          status: 'created',

          // still not ready...so no batch_id
          batch_id: 0
     }
});
