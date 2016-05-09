'use strict';

var rabbit = require('./config');
var ami = new require('asterisk-manager')(
    rabbit.asteriskConnection.port,
    rabbit.asteriskConnection.ip_address,
    rabbit.asteriskConnection.username,
    rabbit.asteriskConnection.password, true);

var request = require('request');
var log4js = require('log4js');
var logForJS = log4js.getLogger();

ami.keepConnected();
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));


// Routes:
app.get('/', function(req, res){
    res.sendFile(__dirname + '/resources/views/index.html');
});

app.get('/out', function(req, res){
    res.sendFile(__dirname + '/resources/views/outbounds.html');
});

//Start
http.listen(3000, function(){
    console.log('listening on *:3000');
});

ami.on('extensionstatus', function (status) {
    //logger('[CID]',status);
});

ami.on('queueparams', function (queueparams) {
    io.emit('queue.callers', queueparams.calls);
    io.emit('queue.servicelevelperf', queueparams.servicelevelperf);
});

ami.on('queueentry', function (queueentery) {
    io.emit('queue.income', {cid: queueentery.calleridnum, agent: queueentery.connectedlinenum });
});

ami.on('queuemember', function (summery) {
    io.emit('queue.members', summery);
});

ami.on('connect', function () {
    logger('[CONNECTED]','Connection to asterisk has been established.');
});

//Every one second we should post event object to NANA.
process.on('uncaughtException', function (error) {
    console.log(error.stack);
    process.exit();
});

var checkQueueStatus = function () {
    ami.action({
      'action':'queuestatus',
      'channel':'from-internal',
      'priority':1
    });

    setTimeout(checkQueueStatus, rabbit.eventSendInterval);
};

checkQueueStatus();

var logger = function (title, log, type) {
    if (!rabbit.debuggable) {
        return;
    }

    if (type === '' || type === undefined) {
        logForJS.info(title, typeof log === 'undefined' ? '' : log);
        
        return;
    }

    logForJS[type](title, typeof log === 'undefined' ? '' : log);
};
