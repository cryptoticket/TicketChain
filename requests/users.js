var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');
var mail_send = require('./helpers/mail_send.js');

var assert = require('assert');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');

// AUTH Get user by short ID
// 
// Params: shortId
// Returns full user tuple
app.get('/auth/users/v1/:shortId',function(request, res, next) {
     if(typeof(request.params.shortId)==='undefined'){
          winston.error('No shortId');
          return next();
     }

     var shortId = request.params.shortId;
     // req.user contains data from JWT (this route is only available for auth users)
     // getUser will compare id with shortId and deny any "HACKER" calls )))
     db_helpers.getUser(req.user,shortId,function(err,user){
          if(err){
               // err message is already printed to winston
               return next(); // 404 with no error
          }

          // TODO: add here your logics

     });
});


// Create new user
//
// Body params: {email: '', pass: ''}
// Returns {shortId: '123456789'} or 404
app.post('/users/v1',function(request, res, next) {
     if(typeof(request.body)==='undefined' || request.body===null){
          return next();
     } 
     if(typeof(request.body.email)==='undefined'){
          winston.error('No email');
          return next();
     }
     if(typeof(request.body.pass)==='undefined'){
          winston.error('No pass');
          return next();
     }

     var email = request.body.email;
     var pass = request.body.pass;

     // 0 - validate email
     if(!helpers.validateEmail(email)){
          winston.error('Bad email');
          return next();
     }

     if(!helpers.validatePass(pass)){
          winston.error('Bad pass');
          return next();
     }

     var sendEmail = true;
     if(typeof(request.query.do_not_send_email)!=='undefined'){
          sendEmail = false;
     }

     // 1 - check if already exists
     db_helpers.findUserByEmail(email,function(err,user){
          if(err){
               winston.error('Error: ' + err);
               return next();
          }

          if(typeof(user)!=='undefined' && user!==null){
               // already exists
               winston.info('User ' + email + ' already exists');
               return res.send('Already exists');
          }

          // 2 - create user + subscription
          var name = request.body.name || '';           // could be empty
          var lastName = request.body.last_name || '';  // could be empty

          var needValidation = true;
          db_helpers.createNewUser(name,lastName,email,pass,undefined,needValidation,function(err,user){
               if(err || typeof(user)==='undefined'){
                    winston.error('Can not create new user: ' + err);
                    return next();
               }

               if(sendEmail){
                    // 4 - send validation e-mail
                    var validationSig = user.validationSig;
                    var validationLink = config.get('mail:validation_link') 
                         + '?sig=' + validationSig 
                         + '&id=' + user.shortId;

                    mail_send.sendUserValidation(user.email,validationLink,function(err){
                         if(err){
                              winston.error('Can not save user to DB: ' + err);
                              return next();
                         }

                         createUserContinue(user,res);
                    });
               }else{
                    createUserContinue(user,res);
               }
          });
     });

});

function createUserContinue(user,res){
     var out = {
          statusCode: 1,
          shortId: user.shortId
     };

     var outData = JSON.stringify(out);
     res.send(outData);
}

// Validate user (email)
//
// Params: shortId
// Params: signature
//
// Returns: redirection to 'OK' or 'BAD' pages
app.post('/users/:shortId/validation/v1',function(request, res, next){
     if(typeof(request.params.shortId)==='undefined'){
          winston.error('No shortId');
          return next();
     }
     if(typeof(request.query.sig)==='undefined'){
          winston.error('No signature');
          return next();
     }

     // 1 - get user
     var shortId = request.params.shortId;
     if(!helpers.validateShortId(shortId)){
          winston.error('Bad shortId');
          return next();
     }

     db.UserModel.findByShortId(shortId,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return next();
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + shortId);
               return next();
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];

          if(user.validated){
               winston.error('Already validated: ' + shortId);
               return next();
          }

          // 3 - validate
          if(request.query.sig!==user.validationSig){
               winston.error('Can not validate user: ' + shortId);
               return next();
          }

          // 4 - save
          user.validationSig = '';
          user.validated = true;
          user.modified = Date.now();

          user.save(function(err){
               if(err){
                    winston.error('Can not save user: ' + shortId);
                    return res.send('OK');
               }

               // send 'registration complete' e-mail
               mail_send.sendRegComplete(user.email,function(err){
                    if(err){
                         winston.error('Can not send reg complete e-mail: ' + err);
                         return res.send('OK');
                    }

                    // 5 - return
                    res.send('OK');
               });
          });
     });
});

// Send e-mail with 'reset your password' text.
// this method always returns 'OK' to cheat attacker. 
app.post('/users/:email/reset_password_request/v1',function(request, res, next){
     winston.info('Reset password request');
     if(typeof(request.params.email)==='undefined'){
          winston.error('No email');
          return res.send('OK');
     }

     // 1 - get user
     var email = request.params.email;
     if(!helpers.validateEmail(email)){
          winston.error('Bad email');
          return res.send('OK');
     }

     winston.info('Reset password email is: ' + email);
     db.UserModel.findByEmail(email,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return res.send('OK');
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + email);
               return res.send('OK');
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];

          if(!user.validated){
               winston.error('Not validated: ' + email);
               return res.send('OK');
          }

          // 3 - generate new signature
          user.modified = Date.now();
          user.resetSig = helpers.generateResetSig(user.email,user.pass);
          user.save(function(err){
               if(err){
                    winston.error('Can not generate validation sig: ' + email);
                    return res.send('OK');
               }

               // 4 - send e-mail 
               var resetLink = config.get('mail:reset_link') 
                    + '?sig=' + user.resetSig
                    + '&id=' + user.shortId;

               mail_send.sendResetPassword(user.email,resetLink,function(err){
                    if(err){
                         winston.error('Can not save user to DB: ' + err);
                         return next();
                    }

                    // OK
                    return res.send('OK');
               });
          });
     });
});

// Create new password (after reset was requested)
app.put('/users/:shortId/password/v1',function(request, res, next){
     if(typeof(request.params.shortId)==='undefined'){
          winston.error('No shortId');
          return next();
     }
     if(typeof(request.query.sig)==='undefined'){
          winston.error('No signature');
          return next();
     }
     // new password is here...
     if(typeof(request.query.new_val)==='undefined'){
          winston.error('No password');
          return next();
     }

     // validate everything
     var shortId = request.params.shortId;
     if(!helpers.validateShortId(shortId)){
          winston.error('Bad shortId');
          return next();
     }

     if(!helpers.validatePass(request.query.new_val)){
          winston.error('Bad pass');
          return next();
     }

     db.UserModel.findByShortId(shortId,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return next();
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + shortId);
               return next();
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];
          if(!user.validated){
               winston.error('Not validated: ' + shortId);
               return next();
          }

          if(typeof(user.resetSig)==='undefined' || !user.resetSig.length){
               winston.error('No signature: ' + shortId);
               return next();
          }

          // 3 - validate
          if(request.query.sig!==user.resetSig){
               winston.error('Can not validate user: ' + shortId);
               return next();
          }

          // 4 - set new password
          user.modified = Date.now();
          user.resetSig = '';

          bcrypt.hash(request.query.new_val, config.get('auth:salt'), function(err, hash) {
               user.password = hash;
               if(err){
                    winston.error('Can not gen hash: ' + err);
                    return next();
               }

               user.save(function(err){
                    if(err){
                         winston.error('Can not save user');
                         return next();
                    }

                    // 5 - send 'password has been changed' email
                    mail_send.sendPassChanged(user.email,function(err){
                         if(err){
                              winston.error('Can not send email to user: ' + err);
                              // eat this error
                              //return next();
                         }

                         res.send('OK');
                    });
               });
          });
     });
});

// Login
//
// Body params: { password: ''}
// Returns: 401 or good JSON web token
app.post('/users/:email/login/v1', function (request, res, next) {
     winston.info('AUTH call');

     if(typeof(request.params.email)==='undefined'){
          winston.error('No email');
          return next();
     }
     if(typeof(request.body)==='undefined' || request.body===null){
          return next();
     } 
     if(typeof(request.body.pass)==='undefined'){
          winston.error('No pass');
          return next();
     }

     var email = helpers.decodeUrlEnc(request.params.email);
     var pass = request.body.pass;

     // 0 - validate email
     if(!helpers.validateEmail(email)){
          winston.error('Bad email');
          return next();
     }

     // 1 - find user
     winston.info('Login: ' + email);

     db.UserModel.findByEmail(email,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return next();
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + email);
               return next();
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];

          if(!user.validated){
               winston.error('Still not validated: ' + email);
               return res.send(401, 'Wrong user or password');
          }

          // 3 - compare password
          //console.log('-->LOGIN PASS: ' + pass);
          //console.log('-->USER SALT: ' + user.salt);

          bcrypt.hash(pass, config.get('auth:salt'), function(err, hash) {
               if(err){
                    winston.error('Can not hash password for check: ' + email);
                    return res.send(401, 'Wrong user or password');
               }
                    
               if(user.password!==hash){
                    winston.error('Bad password result for: ' + email);
                    return res.send(401, 'Wrong user or password');
               }

               // 4 - if OK -> give jwt
               returnJwt(user,res);
          });
     });
});

function returnJwt(user,res){
     var profile = {
          id: user.shortId,
          email: user.email 
     };

     // We are sending the profile inside the token
     var token = jwt.sign(profile, secret, 
          { expiresInMinutes: config.get('auth:expires_minutes') });

     winston.info('User logged in: ' + user.shortId);
     console.log('-->User logged in: ' + user.shortId);

     res.json({ token: token, shortId: user.shortId });
}
