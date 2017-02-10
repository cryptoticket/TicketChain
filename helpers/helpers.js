var config = require('../config');

var crypto = require('crypto');

function encodeUrlDec(dec){
     return encodeURIComponent(dec);
}

function decodeUrlEnc(enc){
     return decodeURIComponent(enc);
}

function getRandom(min, max) {
     return Math.floor(Math.random() * (max - min) + min);
}

function validateInn(inn){
     return (inn.length==10);
}

function validateEmail(email) { 
     var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
     return re.test(email);
} 

function validatePass(pass){
     if(typeof(pass)==='undefined' || pass.length<config.get('auth:min_pass_len')){
          return false;
     }

     return true;
}

function validateShortId(shortId){
     return (shortId<=999999999);
}

function generateValidationSig(email,pass){
     var id = getRandom(1, 999999999);

     // TODO: too weak!
     var s = '' + email + ':' + pass + ':' + id;
     var hash = crypto.createHash('md5').update(s).digest("hex");
     return hash;
}

function generateResetSig(email,pass){
     var id = getRandom(1, 999999999);

     // TODO: too weak!
     var s = '' + email + ':' + pass + ':' + id;
     var hash = crypto.createHash('md5').update(s).digest("hex");
     return hash;
}

function generateSn(){
     var out = '';

     // TODO: 2 symbols
     // 'AB12345678'

     for(var i=0; i<10; ++i){
          out = out + getRandom(1, 9);
     }
     return out;
}

function capitalizeFirst(s){
     var other = s.slice(1).toLowerCase();

     return s.charAt(0).toUpperCase() + other;
}

exports.getRandom = getRandom;

exports.validateInn = validateInn;
exports.validateEmail = validateEmail;
exports.validatePass = validatePass;
exports.validateShortId = validateShortId;

exports.generateSn = generateSn;

exports.generateValidationSig = generateValidationSig;
exports.generateResetSig = generateResetSig;

exports.encodeUrlDec = encodeUrlDec;
exports.decodeUrlEnc = decodeUrlEnc;

exports.capitalizeFirst = capitalizeFirst;
