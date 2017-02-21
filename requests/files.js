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
               winston.info('Update/sell ticket with num: ' + num);

               return updateTicketWithNum(inn,num,words,orgId,cb);
          }else{
               console.log('Update ticket');
          }
     }else if(action=='забраковать'){
          // TODO:

     }else{
          if(num && num.length){
               console.log('Create new blank form with number: ' + num);
               winston.info('Create new blank form with number: ' + num);

               return createNewBlankWithNum(inn,num,words,orgId,cb);
          }else{
               console.log('Create new blank form with any number');
          }
     }

     cb(null);
}

function updateTicketWithNum(inn,sernum,words,orgId,cb){
     getOrganizerByInn(inn,function(err,orgFound,org){
          if(err){return cb(err);}
          if(!orgFound){return cb();}

          db.TicketModel.findOne({organizer:org._id, serial_number:sernum},function(err,ticket){
               if(err){
                    return cb(err);
               }
               if(typeof(ticket)=='undefined' || !ticket){
                    return cb(new Error('Ticket not found' + id));
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

function convertWordsToData(from,data){
     // TODO: add checks
     // return 'Error: ' + bad data...

     convertFromWords(data,from,'priceRub',3);
     convertFromWords(data,from,'isPaperTicket',4);
     convertFromWords(data,from,'issuer',5);
     convertFromWords(data,from,'issuer_inn',6);
     convertFromWords(data,from,'issuer_orgn',7);
     convertFromWords(data,from,'issuer_ogrnip',8);
     convertFromWords(data,from,'issuer_address',9);
     convertFromWords(data,from,'event_title',10);
     convertFromWords(data,from,'event_place_title',11);
     // TODO: date
     //convertFromWords(data,from,'event_date',12);
     convertFromWords(data,from,'event_place_address',13);
     convertFromWords(data,from,'row',14);
     convertFromWords(data,from,'seat',15);
     convertFromWords(data,from,'ticket_category',16);

     //convertFromWords(data,from,'organizer',);

     convertFromWords(data,from,'seller',17);
     convertFromWords(data,from,'seller_inn',18);
     convertFromWords(data,from,'seller_orgn',19);
     convertFromWords(data,from,'seller_ogrnip',20);
     convertFromWords(data,from,'seller_address',21);
     convertFromWords(data,from,'buyer_name',22);
     
     // TODO: date
     //convertFromWords(data,from,'buying_date',23);

     //convertFromWords(data,from,'cancelled_date');

     // no error
     return null;
}

function convertFromWords(to,from,name,index){
     to[name] = from[index];
}

function createNewBlankWithNum(inn,sernum,words,orgId,cb){
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

