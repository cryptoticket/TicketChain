var config = require('../config.js');
var helpers = require('./helpers.js');

var winston = require('winston');
var nodemailer = require('nodemailer');
var fs = require('fs');

String.prototype.replaceAll = function(character,replaceChar){
     var word = this.valueOf();

     while(word.indexOf(character) != -1){
          word = word.replace(character,replaceChar);
     }

     return word;
}

function changeTemplateVar(data,oldVal,newVal){
     if(!data)
          throw new Error('Bad object');

     return data.replaceAll(oldVal,newVal);
}

function makeValidationReport(validationLink,cb){
     var templateFile = 'email/' + config.get('mail:lang') + '/user_validation.html';
     makeBasicReport(templateFile,function(err,data){
          if (err) {
               return cb(err);
          }

          var changes = [
               {from:'*|VALIDATION_LINK|*', to: validationLink},
          ];

          for(var i=0; i<changes.length; ++i){
               data = changeVar(data,changes[i].from,changes[i].to);
          }

          cb(err,data);
     });
}

function makeRegComplete(cb){
     var templateFile = 'email/' + config.get('mail:lang') + '/reg_complete.html';

     makeBasicReport(templateFile,function(err,data){
          if (err) {
               return cb(err);
          }

          cb(err,data);
     });
}

function changeVar(data,varName,changeTo){
     return changeTemplateVar(
          data,
          varName,
          changeTo 
     );
}

function makeResetReport(resetLink,cb){
     var templateFile = 'email/' + config.get('mail:lang') + '/reset_password.html';
     makeBasicReport(templateFile,function(err,data){
          if (err) {
               return cb(err);
          }

          var changes = [
               {from:'*|RESET_LINK|*', to: resetLink},
          ];

          for(var i=0; i<changes.length; ++i){
               data = changeVar(data,changes[i].from,changes[i].to);
          }

          cb(err,data);
     });
}

function makePassChangedReport(cb){
     var templateFile = 'email/' + config.get('mail:lang') + '/pass_changed.html';
     makeBasicReport(templateFile,function(err,data){
          if (err) {
               return cb(err);
          }

          cb(err,data);
     });
}

function makeBasicReport(templateFile,cb){
     var serviceName = helpers.capitalizeFirst(config.get('service_name'));
     var agreementLink = config.get('mail:agreement_link');
     var aboutLink = config.get('mail:about_link');
     var contactsLink = config.get('mail:contacts_link'); 
     var replyTo = config.get('mail:reply_to'); 

     var n = new Date();
     var currYear = n.getFullYear();

     var changes = [
          {from:'*|SERVICE_NAME|*', to: serviceName},
          {from:'*|AGREEMENT_LINK|*', to: agreementLink},
          {from:'*|ABOUT_LINK|*', to: aboutLink},
          {from:'*|CONTACTS_LINK|*', to: contactsLink},
          {from:'*|REPLY_TO|*', to: replyTo},
          {from:'*|CURR_YEAR|*', to: currYear}
     ];

     // 1 - open
     winston.info('Opening email template: ' + templateFile);
     fs.readFile(templateFile, 'utf8', function (err, data) {
          if (err) {
               return cb(err);
          }

          // 2 - substitute parameters
          for(var i=0; i<changes.length; ++i){
               data = changeVar(data,changes[i].from,changes[i].to);
          }

          // 3 - call cb 
          cb(err,data);
     });
}

function sendEmail(sendTo,subjText,text,textHtml,attachmentFile,cb){
     var transport = nodemailer.createTransport("SMTP", {
          service: config.get('mail:service'),
          auth: {
               user: config.get('mail:user'),
               pass: config.get('mail:pass')
          }
     });

     // do not send BCC in case of test (see test/mail_send.js)
     var blindCarbonCopy = config.get('mail:send_copy_to');
     if(sendTo===config.get('mail:reply_to')){
          blindCarbonCopy = '';
     }

     // setup e-mail data with unicode symbols
     var mailOptions = {
           from: config.get('mail:user'),  // sender address
           to: sendTo,                     // list of receivers
           bcc: blindCarbonCopy,

           attachments: [
               {
                    filePath: attachmentFile
               }
           ],

           subject: subjText,              // Subject line
           text: text,                     // plaintext body
           html: textHtml                  // html body
     }

     // send mail with defined transport object
     transport.sendMail(mailOptions, function(error, response){
          if(error){
               console.log('-->Error: ');
               console.log(error);
               return cb(error,response);
          }else{
               console.log("Message sent: " + response.message);
          }

          // if you don't want to use this transport object anymore, uncomment following line
          transport.close(); // shut down the connection pool, no more messages

          cb(error,response);
     });
}

function sendUserValidation(sendTo,validationLink,cb){
     winston.info('Sending user validation e-mail to: ' + sendTo);

     // 2 - make HTML e-mail from template
     makeValidationReport(validationLink,function(err,data){
          if(err){ 
               return cb(err);
          }
          
          var subjText = helpers.capitalizeFirst(config.get('service_name')) + ': Подтверждение регистрации';
          var text     = 'Подтверждение регистрации.';

          // 3 - send email with attachement
          sendEmail(
            sendTo,
            subjText,
            text,

            data,  //textHtml
            '',    //attachment

            function(err,resp){
                 if(err){
                      return cb(err);
                 }

                 winston.info('Mail with attachment sent to...' + sendTo);
                 cb();
          });
     });
}

// after successful validation
function sendRegComplete(sendTo,cb){
     winston.info('Sending reg complete e-mail to: ' + sendTo);

     // 2 - make HTML e-mail from template
     makeRegComplete(function(err,data){
          if(err){ 
               return cb(err);
          }
          
          var subjText = helpers.capitalizeFirst(config.get('service_name')) + ': Регистрация завершена.';
          var text     = "Регистрация успешно завершена.";

          // 3 - send email with attachement
          sendEmail(
            sendTo,
            subjText,
            text,

            data,  //textHtml
            '',    //attachment

            function(err,resp){
                 if(err){
                      return cb(err);
                 }

                 winston.info('Mail with attachment sent to...' + sendTo);
                 cb();
          });
     });
}

function sendResetPassword(sendTo,resetLink,cb){
     winston.info('Sending reset passwrod e-mail to: ' + sendTo);

     // 2 - make HTML e-mail from template
     makeResetReport(resetLink,function(err,data){
          if(err){ 
               return cb(err);
          }
          
          var subjText = helpers.capitalizeFirst(config.get('service_name')) + ': Сброс пароля.';
          var text     = "Сброс пароля.";

          // 3 - send email with attachement
          sendEmail(
            sendTo,
            subjText,
            text,

            data,  //textHtml
            '',    //attachment

            function(err,resp){
                 if(err){
                      return cb(err);
                 }

                 winston.info('Mail with attachment sent to...' + sendTo);
                 cb();
          });
     });
}

function sendPassChanged(sendTo,cb){
     winston.info('Sending passwrod changed e-mail to: ' + sendTo);

     // 2 - make HTML e-mail from template
     makePassChangedReport(function(err,data){
          if(err){ 
               return cb(err);
          }
          
          var subjText = helpers.capitalizeFirst(config.get('service_name')) + ': Пароль изменен.';
          var text     = "Пароль изменен.";

          // 3 - send email with attachement
          sendEmail(
            sendTo,
            subjText,
            text,

            data,  //textHtml
            '',    //attachment

            function(err,resp){
                 if(err){
                      return cb(err);
                 }

                 winston.info('Mail with attachment sent to...' + sendTo);
                 cb();
          });
     });
}

exports.sendEmail = sendEmail;

exports.sendUserValidation = sendUserValidation;
exports.sendResetPassword = sendResetPassword;
exports.sendRegComplete = sendRegComplete;
exports.sendPassChanged = sendPassChanged;
