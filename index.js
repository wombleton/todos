
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    api = require('./routes/api'),
    http = require('http'),
    path = require('path'),
    db = require('./lib/db'),
    app = express(),
    setupLogin = require('./lib/login');

// all environments
app.set('port', process.env.PORT || 3000);

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
// login must be before router
setupLogin(app);
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}


app.get('/', routes.index);
app.post('/register', api.register);

app.get('/todos', api.listTodos);
app.post('/todos', api.insertTodo);
app.put('/todos/:id', api.updateTodo);
app.delete('/todos/:id', api.removeTodo);

db.init(function() { // handle error on init here
  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });
});
