var winston = require('winston');
var assert = require('assert');
var cluster = require('cluster');

var config = require('./config');
var db = require('./db');
var server = require('./server');

//////////// Params:
if(config.get("cluster") && cluster.isMaster) {
     // Count the machine's CPUs
     //var cpuCount = require('os').cpus().length + 2;
     var cpuCount = config.get('cluster_nodes');

     // Create a worker for each CPU
     for (var i = 0; i < cpuCount; i += 1) {
          console.log('-->Starting worker...');
          cluster.fork();
     }

     // Listen for dying workers
     cluster.on('exit', function (worker) {
          // Replace the dead worker,
          // we're not sentimental
          console.log('Worker ' + worker.id + ' died :(');
          cluster.fork();
     });

     return;
}

winston.add(winston.transports.File, { 
     filename: config.get('log_file_path') + config.get('service_name') + '.log' 
});

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
var managePreparationForShutdown = function(callback) {
     // perform all the cleanup and other operations needed prior to shutdown,
     // but do not actually shutdown. Call the callback function only when
     // these operations are actually complete.
     winston.info('Shutting down server');
     server.stop();

     winston.info('Closing DB');
     db.disconnectDb();

     // Everything is OK
     callback();
};

process.on('SIGINT', function() {
     winston.info('Received SIGINT');

     managePreparationForShutdown(function(){
          winston.info('Stopping application');
          process.exit(0);
     });
});

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
// Connect to DB
var db_uri = (process.env.MONGODB_URI || config.get('db:uri'));
var db_user = (process.env.MONGODB_USER || config.get('db:user'));
var db_pass = (process.env.MONGODB_PASS || config.get('db:pass'));

db.connectToDbCallback(
     db_uri,
     db_user,
     db_pass,

     function(err){
          if(!err){
               winston.info("Connected to DB!");
          }else{
               winston.error('DB connection error:', err.message);
          }

          if(err){
               return;
          }
     }
);
     
// Start server
var port = (process.env.PORT || config.get('http_port'));

server.initDb(db);

if(config.get('enable_http')){
     server.startHttp(port);
     winston.info("Listening (http) on " + port);
}

if(config.get('enable_https')){
     var https_port = config.get('https_port');
     server.startHttps(https_port);
     winston.info('Listening (https) on ' + https_port);
}

// If we run under root -> reduce rights
// Notice that running under root is required when we start under
// daemon/forever. Or if we use 'priveleged ports' (not recommended!)
//
// If we run this code under Docker container -> then we run
// it under 'non-root' account that is GOOD. Just set some port like 8080
// to EXPOSE from here
var nodeUserGid = config.get('process_user');
var nodeUserUid = config.get('process_group');

if(!process.getuid()){
     // crash
     //console.log('DO NOT RUN UNDER ROOT!!!');
     //assert.equal(0,1);	

     console.log('WARNING: Reducing rights from ROOT to ' + nodeUserUid);
     process.setgid(nodeUserGid);
     process.setuid(nodeUserUid);
}

