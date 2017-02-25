var application_root = __dirname;

var express = require('express');
var paginate = require('express-paginate');

var fs = require('fs');
var http = require('http');
var https = require('https');
var winston = require('winston');
var expressJwt = require('express-jwt');
var busboy = require('connect-busboy');

var config = require('./config');

///////////// Global variables ))
var db;
var app = express();

var secret = config.get('service_name') + '-backend-secret';

// ## CORS middleware
//
// see: http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
//- See more at: http://cuppster.com/2012/04/10/cors-middleware-for-node-js-and-express/#sthash.N3616BXQ.dpuf
var allowCrossDomain = function(req, res, next) {
     //console.log('-->ALLOW for ');
     //console.log(req);

     //var ref = req.headers.referrer;
     if(config.get('production')){
          if(req.headers.origin){
               res.header('Access-Control-Allow-Origin', req.headers.origin );
          }
     }else {
          // Allow cross-domain access to me (browser check this header)
          res.header('Access-Control-Allow-Origin', '*');
     }

     res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

     // Set to true if you need the website to include cookies in the requests sent
     // to the API (e.g. in case you use sessions)
     res.setHeader('Access-Control-Allow-Credentials', true);

     // intercept OPTIONS method
     if ('OPTIONS' == req.method) {
          res.send(200);
     } else {
          next();
     }
};

var apiCallLimit = function(req,res,next){
     // TODO: calculate API call limit for current IP and deny if 
     // too many

     next();   // continue
}

function rawBody(req, res, next) {
     req.rawBody = '';
     //req.setEncoding('utf8');

     req.on('data', function(chunk) { 
          req.rawBody += chunk;
     });

     next();
}

// allow HTTP method override
app.use(require('method-override')());

app.use(allowCrossDomain);

app.use(rawBody);
app.use(require('body-parser')());

// cookie parsing support, cookie avail through 'req.cookies'
app.use(require('cookie-parser')(config.get('cookie_secret')));

app.use(busboy());

// We are going to protect /auth routes with JWT
app.use('/auth/', expressJwt({secret: secret}));

app.use(apiCallLimit);

app.use(function(req,res,next){
     // TODO: check if this user allowed to make API call (not authentication!)
     //if(!CheckUser(req)){

     if(false){
          next(new Error('Bad user')); // 500
     }else{
          next();
     }
});

app.use(function(err, req, res, next){

     switch (err.name) {
     // this happens when token expires too 
     // so handle that in your frontend and redirect to '/login.html'
     case "UnauthorizedError":
          return res.status(401).send('');
     case "BadRequestError":
     case "UnauthorizedAccessError":
     case "NotFoundError":
          break;
     default:
          break;
     }

     winston.error('ERROR detected: ' + err);
     winston.error(err.stack);

     res.send(500, 'Something went wrong! Contact administrator');
});

app.all(function(req, res, next) {
     if(req.query.limit<50) {
          req.query.limit = 50;
     }

     next();
});

// Remove X-Powered-by: Express header...
app.disable('x-powered-by');

// Graceful shutdown
app.get('/prepShutdown', function(req, res) {
     if( req.connection.remoteAddress == "127.0.0.1"
          || req.socket.remoteAddress == "127.0.0.1"
          || req.connection.socket.remoteAddress == "127.0.0.1"
       ) {
          managePreparationForShutdown(function() {
               // don't complete the connection until the preparation is done.
               res.statusCode = 200;
               res.end();
          });
     } else {
          res.statusCode = 500;
          res.end();
     }
});

// limit, max limit
app.use(paginate.middleware(50, 300));

// This is main APIs file
eval(fs.readFileSync('requests/users.js')+'');
eval(fs.readFileSync('requests/static_pages.js')+'');
eval(fs.readFileSync('requests/organizer.js')+'');
eval(fs.readFileSync('requests/files.js')+'');

function initDb(dbInit){
     db = dbInit;
}

function startHttp(port){
     this.httpServer = http.createServer(app).listen(port);

     this.httpServer.on('connection', function(sock) {
          winston.info('Client connected from ' + sock.remoteAddress);
     });
     
     this.httpServer.on('request', function(req,resp) {
          winston.info('REQ: ' + req.connection.remoteAddress + '.URL: ' + req.url);
     });
}

function startHttps(https_port){
     var ca          = fs.readFileSync( config.get('ssl:ca'), 'utf8');
     var certificate = fs.readFileSync( config.get('ssl:cert'), 'utf8');
     // this was generated while making CSR
     var privateKey  = fs.readFileSync( config.get('ssl:key'), 'utf8');

     var options = {
          ca: ca,
          cert: certificate,
          key: privateKey, 

          // TODO: check this out!

          //requestCert:        true
          //rejectUnauthorized: true 
     };

     this.httpsServer = https.createServer(options, app).listen(https_port);

     this.httpsServer.on('connection', function(sock) {
          winston.info('Client connected from ' + sock.remoteAddress);
     });
     
     this.httpsServer.on('request', function(req,resp) {
          winston.info('HTTPS REQ: ' + req.connection.remoteAddress + '.URL: ' + req.url);
     });
}

function stop(){
     if(this.httpServer){
          this.httpServer.close();
          this.httpServer = null;
     }

     if(this.httpsSever){
          this.httpsServer.close();
          this.httpsServer = null;
     }
}

function processSingleCsvFileTask(cb){
     // 1 - get available tasks
     var task = db.TaskModel.findOne({status:0},function(err,task){
          if(err){
               console.log('Error processing task: ' + err);
               return cb(err);
          }
          if(!task){
               console.log('No tasks found');
               return cb();
          }

          console.log('Processing single task: ' + task._id);
          console.log(task);

          winston.info('Processing single task: ' + task._id);
          winston.info(task);

          // 2 - process it
          // see 'requests/files.js'
          console.log('Start processing: ' + task._id);
          processCsvFile(task.fileNameReal,task._id,task.organizer_inn,function(err){
               if(err){
                    console.log('Error: ' + err);
               }

               console.log('End processing: ' + task._id);
               cb(err);
          });
     });
}

exports.initDb    = initDb;
exports.startHttp = startHttp;
exports.startHttps= startHttps;
exports.stop      = stop;
exports.processSingleCsvFileTask = processSingleCsvFileTask;
