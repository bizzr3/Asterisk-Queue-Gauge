var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var ami = new require('asterisk-manager')(
    global.asteriskConnection.port,
    global.asteriskConnection.ip_address,
    global.asteriskConnection.username,
    global.asteriskConnection.password, true);

ami.keepConnected();

ami.on('peerentry', function (status) {
    logger('[CID]',status);
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

var checkQueueStatus = function () {
    ami.action({
        'action':'queuestatus',
        'channel':'from-internal',
        'priority':1
    });

    ami.action({
        'action':'getconfig',
        'priority':1,
        'variables' : {
            'filename': 'extensions_custom.conf'
        }
    }, function (res) {
        logger('[Peerlist]',res);
    });

    setTimeout(checkQueueStatus, global.eventSendInterval);
};

checkQueueStatus();

module.exports = ami;
