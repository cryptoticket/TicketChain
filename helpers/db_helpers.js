var db = require('../db.js');
var config = require('../config.js');

var helpers = require('./helpers.js');

var winston = require('winston');
var assert = require('assert');

var bcrypt = require('bcrypt');


function isExists(field){
     return (typeof(field)!=='undefined') && (field);
}

function copyField(to,from,field){
     if(field in from){
          to[field] = from[field];
     }
}

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////
function getRandom(min, max) {
     return Math.floor(Math.random() * (max - min) + min);
}

function findUserByEmail(email,cb){
     db.UserModel.findByEmail(email,function(err,users){
          winston.info('FOUND users: ' + users.length);

          if(err){
               winston.error('No users in DB by orderId: ' + err);
               return cb(err);
          }

          if(typeof(users)==='undefined' || (users.length!=1)){
               assert.equal(users.length<=1,true);

               winston.info('No user in DB for orderId: ' + email);
               return cb(null,null);
          }

          cb(null,users[0]);
     });
}

function generateNewUserId(cb){
     // loop until unique ID is found 
     var id = getRandom(1, 999999999);

     db.UserModel.findByShortId(id,function(err,orders){
          if(orders.length==0){
               return cb(id);
          }

          // continue - recurse
          generateNewUserId(cb);
     });
}

function getUser(currentUser,shortId,cb){
     if(!helpers.validateShortId(shortId)){
          winston.error('Bad shortId');
          return cb(null,null);
     }

     if(currentUser.id!==shortId){
          winston.error('DATA for DIFFERENT ID is asked. HACKER DETECTED!!! ' + 
               currentUser.id + ' -> ' + shortId);

          return cb(null,null);
     }

     db.UserModel.findByShortId(shortId,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return cb(err,null);
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + shortId);
               return cb(null,null);
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];
          if(!user.validated){
               winston.error('User not validated: ' + shortId);
               return cb(null,null);
          }

          return cb(null,user);
     });
}

function createNewUser(name,lastName,email,pass,facebookID,needValidation,cb){
     var user = new db.UserModel; 
     user.email = email;

     // hash, salt
     bcrypt.hash(pass, config.get('auth:salt'), function(err, hash) {
          if(err){
               winston.error('Can not gen hash: ' + err);
               return cb(err);
          }

          user.password = hash;
          user.created = user.modified = Date.now();
          user.validated = !needValidation;
          user.validationSig = helpers.generateValidationSig(user.email,user.pass);
          user.comment = '';
          user.facebookID = facebookID;
          user.name = name;
          user.lastName = lastName;

          generateNewUserId(function(id){
               user.shortId = id;

               // 3 - return
               user.save(function(err){
                    if(err){
                         winston.error('Can not save user to DB: ' + err);
                         return cb(err);
                    }

                    winston.info('User created: ' + user.shortId);
                    return cb(null,user);
               });
          });
     });
}

function fromDataToTicket(ticket,from,cb){
     if(isExists(from.issuer_inn) && !helpers.validateInn(from.issuer_inn)){
          return cb(new Error('Bad issuer_inn: ' + from.issuer_inn));
     }
     if(isExists(from.seller_inn) && !helpers.validateInn(from.seller_inn)){
          return cb(new Error('Bad seller_inn: ' + from.seller_inn));
     }

     if(isExists(from.issuer_ogrn) && !helpers.validateOgrn(from.issuer_ogrn)){
          return cb(new Error('Bad issuer_ogrn: ' + from.issuer_ogrn));
     }
     if(isExists(from.seller_ogrn) && !helpers.validateOgrn(from.seller_ogrn)){
          return cb(new Error('Bad seller_ogrn: ' + from.seller_ogrn));
     }

     if(isExists(from.issuer_ogrnip) && !helpers.validateOgrnip(from.issuer_ogrnip)){
          return cb(new Error('Bad issuer_ogrnip: ' + from.issuer_ogrnip));
     }
     if(isExists(from.seller_ogrnip) && !helpers.validateOgrnip(from.seller_ogrnip)){
          return cb(new Error('Bad seller_ogrnip: ' + from.seller_ogrnip));
     }

     copyField(ticket,from,'price_rub');
     copyField(ticket,from,'is_paper_ticket');
     copyField(ticket,from,'issuer');
     copyField(ticket,from,'issuer_inn');
     copyField(ticket,from,'issuer_ogrn');
     copyField(ticket,from,'issuer_ogrnip');
     copyField(ticket,from,'issuer_address');
     copyField(ticket,from,'event_title');
     copyField(ticket,from,'event_place_title');

     copyField(ticket,from,'event_place_address');
     copyField(ticket,from,'row');
     copyField(ticket,from,'seat');
     copyField(ticket,from,'ticket_category');

     //copyField(ticket,from,'organizer');

     copyField(ticket,from,'seller');
     copyField(ticket,from,'seller_inn');
     copyField(ticket,from,'seller_ogrn');
     copyField(ticket,from,'seller_ogrnip');
     copyField(ticket,from,'seller_address');
     copyField(ticket,from,'buyer_name');
     
     // TODO: date
     copyField(ticket,from,'event_date');
     copyField(ticket,from,'buying_date');
     copyField(ticket,from,'cancelled_date');

     return cb(null,ticket);
}

function fromDataToOrganizer(org,from,cb){
     copyField(org,from,'organizer');

     // TODO
     // WARNING: can't be changed?
     //copyField(org,from,'organizer_inn');
     copyField(org,from,'organizer_ogrn');
     copyField(org,from,'organizer_ogrnip');
     copyField(org,from,'organizer_address');

     return cb(null,org);
}

/////////////////////////////////////////////
exports.findUserByEmail = findUserByEmail;
exports.generateNewUserId = generateNewUserId;

exports.getUser = getUser;
exports.createNewUser = createNewUser;

/*
exports.getOrganizerByInn = getOrganizerByInn;
exports.getOrganizerById = getOrganizerById;
*/

exports.fromDataToTicket = fromDataToTicket;
exports.fromDataToOrganizer  = fromDataToOrganizer;
