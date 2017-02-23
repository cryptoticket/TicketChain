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

var Organizer = new Schema({
     organizer: {type: String, required:false},

     organizer_inn: {type: String, required:false},
     organizer_orgn: {type: String, required:false},
     organizer_ogrnip: {type: String, required:false},
     organizer_address: {type: String, required:false},
});

////////////////
var Ticket = new Schema({
     serial_number: {type: String, required:true},

     // 0 - init
     // 1 - sold
     // 2 - cancelled
     state: {type: Number, required:true},
     created: { type: Date, default: Date.now, required: true},

     price_rub: {type: Number, required:false},
     is_paper_ticket: {type: Boolean, required:false},

     issuer: {type: String, required:false},
     // WARNING: inn is required!
     issuer_inn: {type: String, required:false},
     issuer_orgn: {type: String, required:false},
     issuer_ogrnip: {type: String, required:false},
     issuer_address: {type: String, required:false},

     event_title: {type: String, required:false},
     event_place_title: {type: String, required:false},
     event_date: { type: Date, default: Date.now, required:false },
     event_place_address: {type: String, required:false},

     row: {type: String, required:false},
     seat: {type: String, required:false},
     
     ticket_category: {type: Number, required:false},

     organizer: {type: Schema.ObjectId, required: true},

     seller: {type: String, required:false},
     seller_inn: {type: String, required:false},
     seller_orgn: {type: String, required:false},
     seller_ogrnip: {type: String, required:false},
     seller_address: {type: String, required:false},

     buyer_name: {type: String, required:false},
     buying_date: { type: Date, default: Date.now, required:false },
     cancelled_date: { type: Date, default: Date.now, required:false }
});


var Batch = new Schema({
     organizer: {type: Schema.ObjectId, required:true},

	tickets: [{
		ticketId: {type:Schema.ObjectId, required:true},
     }],
});

var Task = new Schema({
     fileName: {type: String, required:true},
     fileNameReal: {type: String, required:true},
     organizer_inn: {type: String, required:true},

     // 0 - created
     // 1 - processing
     // 2 - ready
     status: {type: Number, required:true},

     batch_id: {type: Schema.ObjectId, required:false},

     // each item is a line index
	error_indexes: [{
		index: {type:Number, required:false},
     }],
     // each item is a serial_number
	collisions: [{
		serial_number: {type:String, required:false},
     }]
});

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
     mongoose.connection.once('connected', () => {
         mongoose.connection.db.dropDatabase();
         cb();
     });
}

// Exports:
var UserModel = mongoose.model('User', User);
var TicketModel = mongoose.model('Ticket', Ticket);
var OrganizerModel = mongoose.model('Organizer', Organizer);
var BatchModel = mongoose.model('Batch', Batch);
var TaskModel = mongoose.model('Task', Task);

module.exports.UserModel = UserModel;
module.exports.TicketModel = TicketModel;
module.exports.OrganizerModel = OrganizerModel;
module.exports.BatchModel = BatchModel;
module.exports.TaskModel = TaskModel;

// 
module.exports.blockLogging = blockLogging;
module.exports.connectToDb  = connectToDb;
module.exports.connectToDbCallback  = connectToDbCallback;
module.exports.disconnectDb = disconnectDb;

module.exports.removeDb = removeDb;

