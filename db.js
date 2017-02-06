var mongoose = require('mongoose');
var winston = require('winston');
var async = require('async');

var config = require('./config');

var Schema = mongoose.Schema;

//////
var User = new Schema({
     // user can log in using this one too
     shortId: {type: String, required:true},
     email: {type: String, required: true},
     password: {type: String, required: true},
     validated: {type:Boolean, required: true},

     // optional
     facebookID: {type: String, required:false},

     validationSig: {type: String, required: false},
     resetSig: {type: String, required: false},

     created: { type: Date, default: Date.now, required:false },
     modified: { type: Date, default: Date.now, required:false },

     comment: {type: String, required:false}
});

User.statics.findByEmail = function(e,cb){
     this.find({ email: e}, cb);
}

User.statics.findByShortId = function(id,cb){
     this.find({ shortId: id }, cb);
}

User.statics.findByFacebookID = function(id,cb){
     this.find({facebookID: id}, cb);
}

//////////////////////////////////////////////////
//////////////////////////////////////////////////
var Subscription = new Schema({
     userShortId: {type: String, required:true},

     // 1-"free"
     // 2-"premium" 
     type:{ type: Number, required: true},

     created: { type: Date, default: Date.now, required:true},
     expires: { type: Date, default: Date.now, required:true},

     modified: { type: Date, default: Date.now, required:false }
});

Subscription.statics.findByShortId = function(usi,cb){
     this.find({ userShortId: usi}, cb);
}

/// \brief Call this one and keep returned object
function connectToDbCallback(uri,user,pass,cb){
     var options = {
          db: { native_parser: true },
          server: { poolSize: 5 },
          //replset: { rs_name: 'myReplicaSetName' },
          user: user,  // can be empty 
          pass: pass,  // can be empty 
     };

     options.server.socketOptions = { keepAlive: 1 };
     //options.replset.socketOptions = { keepAlive: 1 };

     mongoose.connect(uri,options);
     var db = mongoose.connection;

     db.on('error', function (err) {
          cb(err);
     });

     db.once('open', function callback () {
          cb(null,db);
     });

     db.on('disconnected', function () {
          winston.info('DB disconnected');
     });
}


// Simple wrapper for convinience...
function connectToDb(uri,user,pass){
     // We are under tests - so setup behaviour
     if(uri.indexOf('test')!==-1){

     }

     return connectToDbCallback(uri,user,pass,function(err,cb){
          if(!err){
               winston.info("Connected to DB!");
          }else{
               winston.error('DB connection error:', err.message);
          }
     });
}

function blockLogging(){
     winston.remove(winston.transports.Console);
}

/// \brief Call this one when connection is no more needed
function disconnectDb(){
     mongoose.disconnect();
}

function removeDb(cb){
     mongoose.connection.db.dropDatabase();
     cb();
}

// Exports:
var UserModel = mongoose.model('User', User);
var SubscriptionModel  = mongoose.model('Subscription', Subscription);

module.exports.UserModel = UserModel;
module.exports.SubscriptionModel = SubscriptionModel;

// 
module.exports.blockLogging = blockLogging;
module.exports.connectToDb  = connectToDb;
module.exports.connectToDbCallback  = connectToDbCallback;
module.exports.disconnectDb = disconnectDb;

module.exports.removeDb = removeDb;

