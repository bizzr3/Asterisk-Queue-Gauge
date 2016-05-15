var express = require('express');
var app = express();
var engines = require('consolidate');
var routes = require('./routes');
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));
app.engine('html', engines.hogan);
app.set('view engine', 'html');
app.set('views', global.appRoot + '/resources/views');
console.log(global.appRoot + '/resources/views');
app.use('/', routes);

app.listen(8080, function () {
    console.log('LISTENING ON 8080');
});

module.exports = app;
