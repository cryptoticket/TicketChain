var nconf = require('nconf');
var fs   = require("fs");

// find config recursively 
var prefix = '';

var lookHere = [
     './',
     '../',
     '../../',
     '../../../',
];

for(var i=0; i<lookHere.length; ++i){
     prefix = lookHere[i];

     var found = false;

     var files = fs.readdirSync(prefix);
     files.forEach(function(f){
          if(f==='config.json'){
               found = true;
          }
     });

     if(found){
          break;    // stop
     }
}

nconf.argv().env().file({file: prefix  + 'config.json'});

module.exports = nconf;
