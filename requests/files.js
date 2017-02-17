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
               // generate new task
               var task = new db.TaskModel;

               task.fileName = filename;
               task.fileNameReal = generatedFileName;
               task.status = 0;

               task.save(function(err){
                    if(err){
                         return next(err);
                    }

                    var out = {
                         fileName: generatedFileName,
                         job_id: task._id
                    };
                    res.json(out);
               });
          });
     });

});

app.get('/api/v1/csv_job/:job_id',function(req, res, next) {
     if(typeof(req.params.job_id)==='undefined'){
          winston.error('No job_id provided');
          return next();
     }
     var id = req.params.job_id;
     // TODO: check id

     db.TaskModel.find({_id:id},function(err,tasks){
          if(err){
               return next(err);
          }

          if(!tasks || !tasks.length){
               winston.info('Task ' + id + ' not found');
               return next();
          }

          var task = tasks[0];

          var out = {
               // still not ready...so no batch_id
               // TODO: 
               batch_id: task.batch_id
          }

          if(!task.status){
               out.status = 'created';
          }else if(task.status==1){
               out.status = 'processing';
          }else if(task.status==2){
               out.status = 'ready';
          }

          return res.json(out);
     });
});
