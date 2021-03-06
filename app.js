
/**
 * Module dependencies.
 */

 var express = require('express')
 , https = require('https')
 , fs = require('fs')
 , routes = require('./routes')
 , mongodb = require('mongodb')
 , expressValidator = require('express-validator')
 , flash = require('connect-flash');


var app = express.createServer();
//mongodb
//var mongo = new mongodb.Server('127.0.0.1',27017);
var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost/dash';
mongodb.connect(mongoUri, function (err,db) {
    if (err) {throw err; };
  console.log('connected to mongodb');

  app.users = db.collection('users');

 //ensureIndex*/
  app.users.ensureIndex('username',{unique:true}, function (err) {
    if (err) {throw err;};
    app.users.ensureIndex('email',function (err) {
      if (err) {throw err;};
      console.log('ensured indexes');
    });
  });
});
//all done, listen!

var port = process.env.PORT || 8000;

app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
//express-validator
  app.use(expressValidator());
  app.use(express.methodOverride());
  //session support
  app.use(express.cookieParser());
  app.use(express.session({secret: '123456789QWERTY', cookie:{ maxAge: 60000}}));
  //flash support
  app.use(flash());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

//GET
app.get('/', routes.index);
app.get('/login', routes.login);
app.get('/register', routes.register);
app.get('/code',restrict, routes.code);
app.get('/key',restrict, routes.key);
app.get('/logout', routes.logout);

//restricted area
app.get('/dashboard',restrict, routes.dashboard);
//validate username && email
app.get('/validate/username', routes.validate.username);
app.get('/validate/email', routes.validate.email);

//POST
app.post('/register', routes.registerUser);
app.post('/login',routes.loginUser);
app.post('/code',restrict,routes.codeUser);
app.post('/key',restrict,routes.keyUser);
app.post('/restore',restrict,routes.restoreKeyUser);
app.post('/replies', routes.replies);

function restrict (req,res,next) {
  //if auth
  if (req.session.authenticated){
    //PASS
    next();
  }else{
  //console.log(req.session.authenticated);
  //not allowed
  res.render('login',{flash:{ type: 'alert-danger', messages: [{msg: 'You must be logged for this function'}]}});
  }
}