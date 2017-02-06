#!/usr/bin/env node

//Tell the server to gracefully prepare for shutdown, but do not end the process.
console.log("Prepare for shutdown");

var http = require("http");

var options = {
host: "localhost",
      port: 80,
      path: "/prepShutdown",
      method: "HEAD"
};

var request = http.request(options, function(response) {
     console.log("Server completed preparations for shutdown");
});

request.end();
request.on("error", function(error) {
     throw error;
});
