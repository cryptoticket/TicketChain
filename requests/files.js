var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');

var winston = require('winston');
var assert = require('assert');
var knox  = require('knox');
var lineByLine = require('line-by-line');

app.post('/api/v1/organizers/:inn/csv_jobs',function(req, res, next) {
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

          fstream = fs.createWriteStream('files/' + generatedFileName);
          file.pipe(fstream);

          fstream.on('close', function () {
               // generate new task
               var task = new db.TaskModel;

               task.fileName = filename;
               task.fileNameReal = generatedFileName;
               task.status = 0;
               task.organizer_inn = '1234567890';

               console.log('Saving task: ' + task._id);
               task.save(function(err){
                    if(err){
                         return next(err);
                    }

                    var out = {
                         fileName: generatedFileName,
                         job_id: task._id
                    };

                    if(blocking){
                         // Do the processing
                         processCsvFile(generatedFileName,task._id,task.organizer_inn,function(err){
                              if(err){
                                   return next(err);
                              }

                              res.json(out);
                         });
                    }else{
                         res.json(out);
                    }
               });
          });
     });
});

app.get('/api/v1/organizers/:inn/csv_jobs/:job_id',function(req, res, next) {
     if(typeof(req.params.job_id)==='undefined'){
          winston.error('No job_id provided');
          return next();
     }
     var id = req.params.job_id;

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
               batch_id: task.batch_id,
               file_name: task.fileName,
               // TODO: 
               processed_items: 0 
          }

          if(!task.status){
               out.status = 'created';
          }else if(task.status==1){
               out.status = 'processing';
          }else if(task.status==2){
               out.status = 'ready';
          }

          convertErrorsOut(task,out);
          convertCollisionsOut(task,out);

          return res.json(out);
     });
});

function convertErrorsOut(task,out){
     out.errors = [];
     if(!task.errors){
          return;
     }
     for(var i=0; i<task.errors.length; ++i){
          out.errors.push(task.errors[i].index);
     }
}

function convertCollisionsOut(task,out){
     out.collisions = [];
     if(!task.collisions){
          return;
     }
     for(var i=0; i<task.collisions.length; ++i){
          out.collisions.push(task.collisions[i].serial_number);
     }
}

function processCsvFile(fileName,jobId,inn,cb){
     // 1 - set to processing 
     db.TaskModel.findOne({_id:jobId},function(err,task){
          if(err){
               return cb(err);
          }
          if(!task){
               winston.error('No tasks found: ' + jobId);
               return cb();
          }

          task.state = 1;
          task.save(function(err){
               if(err){
                    return cb(err);
               }

               // 2 - process
               processCsvFileInt(fileName,jobId,inn,function(err,colls,errors,batchId){
                    if(err){
                         // WARNING: even if error -> skip this task
                         return cb();
                    }

                    // 3 - set status to "ready"
                    task.status = 2;
                    task.batch_id = batchId; 

                    setErrorsToTask(errors,task);
                    setCollisionsToTask(colls,task);

                    // TODO: if something throws exception during processFile -> task will not be updated...
                    task.save(function(err){
                         cb(err);
                    });
               });
          });
     });
}

// each item is a line index
function setErrorsToTask(errors,task){
     for(var i=0; i<errors.length; ++i){
          // process it here
          task.error_indexes.push({index: errors[i]});
     }
}

// each item is a sernum
function setCollisionsToTask(colls,task){
     for(var i=0; i<colls.length; ++i){
          task.collisions.push({serial_number: colls[i]});
     }
}


function processCsvFileInt(fileName,jobId,inn,cb){
     winston.info('Process job: ' + jobId);
     console.log('Process job: ' + jobId);

     var filePath = 'files/' + fileName;
     if(!fs.existsSync(filePath)){
          return cb(new Error('File does not exist: ' + filePath));
     }

     createOrganizer(inn,function(err,orgId){
          if(err){
               return cb(err);
          }

          var collisions = [];
          var errors = [];
          var lineIndex = 0;

          // create batch
          var batch = new db.BatchModel();
          batch.organizer = orgId;
          batch.tickets = [];

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

                    console.log('IS COLLISION: ' + isCollision);
                    if(!err && !isCollision){
                         // add to batch!
                         batch.tickets.push({ticketId: ticket._id});
                    }

                    lineIndex = lineIndex + 1;
                    lr.resume();
               });
          });
          lr.on('end', function () {
               // All lines read, file is closed now.
               winston.info('Saving batch');
               batch.save(function(err){
                    cb(err,collisions,errors,batch._id);
               });
          });
     });
}

function processLine(inn,line,orgId,cb){
     var words = line.split(',');

     var action = words[1];
     var num = words[2];

     if(action=='билет'){
          if(num && num.length){
               console.log('Update/sell ticket with num: ' + num);
               winston.info('Update/sell ticket with num: ' + num);

               return updateTicketWithNum(inn,num,words,orgId,cb);
          }else{
               console.log('Update ticket');

               // TODO: 
               return cb(new Error('NOT SUPPORTED YET!'));
          }
     }else if(action=='забраковать'){
          console.log('Cancell ticket with num: ' + num);
          winston.info('Cancell ticket with num: ' + num);

          if(!num || !num.length){
               return cb(new Error('Bad num'));
          }
          return cancelTicket(inn,num,words,orgId,cb);
     }else{
          if(num && num.length){
               console.log('Create new blank form with number: ' + num);
               winston.info('Create new blank form with number: ' + num);

               return createNewBlankWithNum(inn,num,words,orgId,cb);
          }else{
               console.log('Create new blank form with any number');
               winston.info('Create new blank form with any number');

               var num = helpers.generateSn();

               // TODO: 
               // checkIfUniqueSerNum(ticket.serial_number,function(err,isUnique){
               return createNewBlankWithNum(inn,num,words,orgId,cb);
          }
     }
}

function updateTicketWithNum(inn,sernum,words,orgId,cb){
     if(!helpers.validateSernum(sernum)){
          return cb(new Error('Bad custom serial num: ' + sernum));
     }

     getOrganizerByInn(inn,function(err,orgFound,org){
          if(err){return cb(err);}
          if(!orgFound){return cb();}

          db.TicketModel.findOne({organizer:org._id, serial_number:sernum},function(err,ticket){
               if(err){
                    return cb(err);
               }
               if(typeof(ticket)=='undefined' || !ticket){
                    return cb(new Error('Ticket not found' + sernum));
               }

               // convert 
               var convertedData = {};
               var err = convertWordsToData(words,convertedData);
               if(err){
                    return cb(err);
               }

               // update
               fromDataToTicket(ticket,convertedData,function(err,ticketOut){
                    if(err){
                         return cb(err);
                    }

                    ticketOut.state = 1;     // sold

                    ticketOut.save(function(err){
                         if(err){
                              return cb(err);
                         }

                         //res.json({});
                         cb(null,false,ticketOut,ticketOut.serial_number);
                    });
               });
          });
     });
}

function cancelTicket(inn,num,words,orgId,cb){
     if(!helpers.validateSernum(num)){
          return cb(new Error('Bad custom serial num: ' + num));
     }

     db.TicketModel.findOne({organizer:orgId, serial_number:num},function(err,ticket){
          if(err){return cb(err);}
          if(!ticket){return cb(new Error('No ticket found'));}

          // "cancelled"
          changeStateInternal(null,inn,ticket._id,2,function(err){
               // err,isCollision,ticket,sernum
               return cb(err,false,ticket,num);
          });
     });
}

function convertWordsToData(from,data){
     convertFromWords(data,from,'price_rub',3);
     convertFromWords(data,from,'is_paper_ticket',4);
     convertFromWords(data,from,'issuer',5);
     convertFromWords(data,from,'issuer_inn',6);
     convertFromWords(data,from,'issuer_ogrn',7);
     convertFromWords(data,from,'issuer_ogrnip',8);
     convertFromWords(data,from,'issuer_address',9);
     convertFromWords(data,from,'event_title',10);
     convertFromWords(data,from,'event_place_title',11);
     convertFromWords(data,from,'event_place_address',13);
     convertFromWords(data,from,'row',14);
     convertFromWords(data,from,'seat',15);
     convertFromWords(data,from,'ticket_category',16);

     //convertFromWords(data,from,'organizer',);

     convertFromWords(data,from,'seller',17);
     convertFromWords(data,from,'seller_inn',18);
     convertFromWords(data,from,'seller_ogrn',19);
     convertFromWords(data,from,'seller_ogrnip',20);
     convertFromWords(data,from,'seller_address',21);
     convertFromWords(data,from,'buyer_name',22);
     
     convertFromWords(data,from,'event_date',12);
     convertFromWords(data,from,'buying_date',23);
     convertFromWords(data,from,'cancelled_date',24);

     // no error
     return null;
}

function convertFromWords(to,from,name,index){
     try {
          if(typeof(from[index])!=='undefined' && from[index]){
               to[name] = from[index].trim();
          }
     }catch(e){

     }
}

function createNewBlankWithNum(inn,sernum,words,orgId,cb){
     if(!helpers.validateSernum(sernum)){
          return cb(new Error('Bad custom serial num: ' + num));
     }

     createNewBlankTicket(inn,orgId,sernum,function(err,ticket,isCollision){
          if(err){
               return cb(err);
          }
          if(isCollision){
               return cb(null,true,null,sernum);
          }
          
          winston.info('Created new ticket: ' + ticket._id + '; serial_number= ' + ticket.serial_number);
          return cb(null,false,ticket);     
     });
}

