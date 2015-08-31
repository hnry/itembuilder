var express = require('express')
  ,	app = express()
  ,	bparser = require('body-parser')
  ,	serveStatic = require('serve-static');

var routes = require('./lib/routes');

app.disable('x-powered-by');
var compress = require('compression');
app.use(compress());

app.use(bparser.urlencoded({ extended: false }));
app.use(bparser.json());

app.use(serveStatic('public_html'));
app.get('/download/:id.json', routes.download);

var env = process.env.NODE_ENV || 'development';
if (env === 'development') {
  app.use(function(req, res, next) {
    var t = new Date();
    res.on('finish', function() {
      var tt = new Date();
      var tfinish = tt.getTime() - t.getTime();
      console.log(res.statusCode, req.method, req.url, tfinish + 'ms');
    });
    next();
  });
}

var path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

///////////////////////////////////////

app.get('/', routes.index);
// api to create
app.post('/create/new', routes.apiCreate);
// api to get itemset data
app.get('/itemset/:id', routes.apiView);
// 404
app.use(function(req, res) {
	res.render('notfound');
});

///////////////////////////////////////

var ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 3000;

app.listen(port, ip, function() {
	console.log('server started in', env, 'mode');
});