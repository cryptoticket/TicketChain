
function getData(port,url,authToken,cb){
     var opts = {
          host: 'localhost',
          port: port,
          path: url,
          method: 'GET',
          headers: {
          }
     };

     if(authToken!==''){
          opts.headers['Authorization'] = 'Bearer ' + authToken;
     }

     var req = http.request(opts, function (res) {
          var dataOut = '';
          res.on('data', function (chunk) {
               dataOut += chunk;
          });

          res.on('end', function () {
               cb(null,res.statusCode,dataOut);
          });
     });

     req.write('');
     req.end();
}

function postData(port,url,post_data,cb){
     commonRequest('POST',port,url,post_data,'',cb);
}
function postDataAuth(port,url,post_data,authToken,cb){
     commonRequest('POST',port,url,post_data,authToken,cb);
}

function deleteData(port,url,cb){
     commonRequest('DELETE',port,url,'','',cb);
}
function deleteDataAuth(port,url,authToken,cb){
     commonRequest('DELETE',port,url,'',authToken,cb);
}

function putData(port,url,post_data,cb){
     commonRequest('PUT',port,url,post_data,'',cb);
}
function putDataAuth(port,url,post_data,authToken,cb){
     commonRequest('PUT',port,url,post_data,authToken,cb);
}

function commonRequest(httpVerb,port,url,post_data,authToken,cb){
     var len = Buffer.byteLength(post_data, 'utf8');

     var opts = {
          host: 'localhost',
          port: port,
          path: url,
          method: httpVerb,
          headers: {
               'Content-Type': 'application/json',
               'Content-Length': len
          }
     };

     if(authToken!==''){
          opts.headers['Authorization'] = 'Bearer ' + authToken;
     }

     var req = http.request(opts, function (res) {
          var dataOut = '';
          res.on('data', function (chunk) {
               dataOut += chunk;
          });

          res.on('end', function () {
               cb(null,res.statusCode,res.headers,dataOut);
          });
     });

     req.write(post_data);
     req.end();
}
