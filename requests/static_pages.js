
app.get('/index.html', function(request, res) {
     var body = 'Please contact administrator...';

     res.setHeader('Content-Type', 'text/plain');
     res.setHeader('Content-Length', body.length);
     res.end(body);
});

app.get('/', function(req, res){
     res.redirect('index.html');
});

// Example:
//app.use("/pictures", express.static(__dirname + '/pictures'));
