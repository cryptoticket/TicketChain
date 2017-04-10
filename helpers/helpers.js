var config = require('../config');

var fs = require('fs');
var winston = require('winston');
var crypto = require('crypto');
var lineByLine = require('line-by-line');

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
     return (inn.length==10) || (inn.length==12);
}

function validateOgrn(ogrn){
     return (ogrn.length==13);
}

function validateOgrnip(ogrnip){
     return (ogrnip.length==15);
}

function validateSernum(sernum){
     // TODO: check 2 cyr letters + 6 numbers
     console.log('sernum len: ' + sernum.length);

     return (sernum.length==8);
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

function getLetters(){
     // 28 letters only, instead of 33
     // missing:
     // Ё
     // Й
     // Щ
     // Ь
     // Ъ
     var letters = [
          'А','Б','В','Г','Д','Е','Ж','З','И','К','Л','М','Н',
          'О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Ы','Э','Ю','Я'
     ];
     
     return letters;
}

function getLetterPos(l){
     var letters = getLetters();

     for(var i=0; i<letters.length; ++i){
          if(letters[i]==l){
               return i;
          }
     }

     return -1;
}

function generateSn(){
     var out = '';

     var letters = getLetters();

     // TODO: 2 symbols
     // 'AB12345678'
     for(var i=0; i<2; ++i){
          var l = '' + letters[getRandom(0, letters.length - 1)];
          out = out + l;
     }

     for(var i=0; i<6; ++i){
          out = out + getRandom(1, 9);
     }
     return out;
}

function capitalizeFirst(s){
     var other = s.slice(1).toLowerCase();

     return s.charAt(0).toUpperCase() + other;
}

function generateFileName(){
     var o = '';
     for(var i=0; i<12; ++i){
          o = o + getRandom(0,9);
     }
     return o;
}

function dateToUnix(d){
     var tmp = new Date(Date.parse(d));
     return Math.trunc(tmp.getTime() / 1000);
}

function incrementSerialNumber(s){
     var series = s.substring(0,2);
     var num = Number(s.substring(2,8));

     if(num==999999){
          // TODO: increase series 
     }else{
          num = num + 1;
     }

     var strNum = '' + num;
     var addZeroes = (6 - strNum.length);
     for(var i=0; i<addZeroes; ++i){
          strNum = '0' + strNum; 
     }

     var out = series + strNum;
     return out;
}


exports.getRandom = getRandom;

exports.validateInn = validateInn;
exports.validateOgrn = validateOgrn;
exports.validateOgrnip = validateOgrnip;
exports.validateSernum = validateSernum;

exports.validateEmail = validateEmail;
exports.validatePass = validatePass;
exports.validateShortId = validateShortId;

exports.getLetterPos = getLetterPos;
exports.generateSn = generateSn;
exports.generateFileName = generateFileName;

exports.generateValidationSig = generateValidationSig;
exports.generateResetSig = generateResetSig;

exports.encodeUrlDec = encodeUrlDec;
exports.decodeUrlEnc = decodeUrlEnc;

exports.capitalizeFirst = capitalizeFirst;
exports.dateToUnix = dateToUnix;
exports.incrementSerialNumber = incrementSerialNumber;
