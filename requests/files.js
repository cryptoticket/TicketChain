var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');

var winston = require('winston');
var assert = require('assert');
var knox  = require('knox');
var lineByLine = require('line-by-line');

app.post('/api/v1/organizers/:inn/csv_job',function(req, res, next) {
     if(typeof(req.params.inn)==='undefined'){
          winston.error('No inn');
          return next();
     }
     var inn = req.params.inn;
     if(!helpers.validateInn(inn)){
          winston.error('Bad inn');
          return next();
     }

     winston.info('POST File');

     // for tests
     var blocking = (typeof(req.query.blocking)!=='undefined');

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
               task.organizer_inn = '1234567890';

               task.save(function(err){
                    if(err){
                         return next(err);
                    }

                    var out = {
                         fileName: generatedFileName,
                         job_id: task._id
                    };

                    if(blocking){
                         // processing
                         task.status = 1;
                         task.save(function(err){
                              // Do the processing
                              processFile(generatedFileName,task._id,task.organizer_inn,function(err,colls,errors){
                                   // TODO: process errors, colls


                                   // ready
                                   task.status = 2;
                                   task.save(function(err){
                                        res.json(out);
                                   });
                              });
                         });
                    }else{
                         res.json(out);
                    }
               });
          });
     });

});

app.get('/api/v1/organizers/:inn/csv_job/:job_id',function(req, res, next) {
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


function processFile(fileName,jobId,inn,cb){
     winston.info('Process job: ' + jobId);
     console.log('Process job: ' + jobId);

     var filePath = 'files/' + fileName;
     if(!fs.existsSync(filePath)){
          return cb(new Error('File does not exist: ' + fileName));
     }

     createOrganizer(inn,function(err,orgId){
          if(err){
               return cb(err);
          }

          var collisions = [];
          var errors = [];
          var lineIndex = 0;

          var lr = new lineByLine(filePath);
          lr.on('error', function (err) {
               return cb(err);
          });

          lr.on('line', function (line) {
               lr.pause();

               processLine(inn,line,orgId,function(err,isCollision,ticket,sernum){
                    if(err){
                         errors.push(lineIndex);
                    }
                    if(isCollision){
                         collisions.push(sernum);
                    }

                    lineIndex = lineIndex + 1;
                    lr.resume();
               });
          });
          lr.on('end', function () {
               // All lines read, file is closed now.

               cb(null,collisions,errors);
          });
     });
}

function processLine(inn,line,orgId,cb){
     console.log('Line: ');
     console.log(line);

     var words = line.split(',');

     var action = words[1];
     var num = words[2];

     if(action=='билет'){
          if(num && num.length){
               console.log('Update/sell ticket with num: ' + num);
               return updateTicketWithNum(inn,num,words,orgId,cb);
          }else{
               console.log('Update ticket');
          }
     }else if(action=='забраковать'){
          // TODO:

     }else{
          if(num && num.length){
               console.log('Create new blank form with number: ' + num);
               return createNewBlankWithNum(inn,num,words,orgId,cb);
          }else{
               console.log('Create new blank form with any number');
          }
     }

     cb(null);
}

function updateTicketWithNum(inn,num,words,orgId,cb){
       

     cb(null);
}

function createNewBlankWithNum(inn,sernum,words,orgId,cb){
     createNewBlankTicket(inn,orgId,sernum,function(err,ticket,isCollision){
          if(err){
               return cb(err);
          }
          if(isCollision){
               return cb(null,true,null,sernum);
          }
          
          winston.info('Added ticket: ' + ticket._id + '; serial_number= ' + ticket.serial_number);
          return cb(null,false,ticket);     
     });
}

