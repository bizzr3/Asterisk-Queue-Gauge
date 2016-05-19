'use strict';

require('./config');
var mailFactory = require('./app/services/email');
var logger = require('./app/utils/logger');
var queue = require('./app/utils/queue');
var AST_TAG = '[ASTERISK]';
//var CronJob = require('cron').CronJob;
var mysql = require('mysql');
var outbound = false;

var ami = new require('asterisk-manager')(
    global.asteriskConnection.port,
    !global.devMode ? global.asteriskConnection.ip_address
        : global.asteriskConnection.debug_ip_address,
    global.asteriskConnection.username,
    global.asteriskConnection.password, true);
var cdrDatabaseConnection;

ami.keepConnected();

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

// Routes:
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/resources/views/index.html');
    checkQueueStatus();
});

app.get('/out', function (req, res) {
    res.sendFile(__dirname + '/resources/views/outbounds.html');
    cdrDatabaseConnection = mysql.createConnection({
        host: '127.0.0.1',
        user: 'asteriskuser',
        password: 'amp109',
        database: 'asteriskcdrdb'
    });

    cdrDatabaseConnection.connect(function (err) {
        if (err) console.log(err.stack);
    });
    checkAgentStatus();
});

//Start
http.listen(global.http_port, function () {
    console.log('listening on *:' + global.http_port);
});

var peerListTemp = [];
ami.on('peerlistcomplete', function (status) {
    global.peers = peerListTemp;
    peerListTemp = [];
    io.emit('peer.statusChanged', global.peers);
});

ami.on('dial', function (dial) {
    if (/Begin|End/.test(dial.subevent)) {
        io.emit('peer.statusChanged', dial);
    }
});

ami.on('peerentry', function (peersStatus) {
    peerListTemp.push(peersStatus);
});


ami.on('peerstatus', function (peersStatus) {
    //console.log(peersStatus);
});

ami.on('queueparams', function (queueparams) {
    try {
        io.emit('queue.callers', queueparams.calls);
        io.emit('queue.servicelevelperf', queueparams.servicelevelperf);
    } catch (error) {
        logger.log(AST_TAG, error.stack(), 'fatal');
    }
    queue.updateQueuePerformace(queueparams.servicelevelperf);
});

ami.on('queueentry', function (queueentery) {
    try {
        io.emit('queue.income', {cid: queueentery.calleridnum, agent: queueentery.connectedlinenum});
    } catch (error) {
        logger.log(AST_TAG, error.stack(), 'fatal');
    }
});

ami.on('queuemember', function (agent) {
    queue.updateAgentsList(agent);
    try {
        io.emit('queue.members', agent);
    } catch (error) {
        logger.log(AST_TAG, error.stack(), 'fatal');
    }
});

ami.on('connect', function () {
    logger.log(AST_TAG, 'Connection to asterisk (' + ami.options.host + ') has been established.');
});

process.on('uncaughtException', function (error) {
    logger.log('[FAILURE]', error.stack, 'fatal');
});

io.sockets.on('connection', function (socket) {
    socket.on('report.send', function () {
        mailFactory.sendMetricEmail();
        io.emit('report.sent', JSON.stringify({status: 200, message: 'Report sent via email.'}));
    });

    socket.on('peers.getList', function () {
        var databaseConnection = mysql.createConnection({
            host: '127.0.0.1',
            user: 'asteriskuser',
            password: 'amp109',
            database: 'asterisk'
        });

        databaseConnection.connect(function (err) {
            if (err) return;

            databaseConnection.query("select * from users where extension in(" + global.activeAgentsList + ")", function (error, users) {
                io.emit('peers.list', users);
            });
        });
    });
});

var checkQueueStatus = function () {
    ami.action({
        'action': 'queuestatus',
        'channel': 'from-internal',
        'priority': 1
    });
    setTimeout(checkQueueStatus, global.eventSendInterval);
};


var checkAgentStatus = function () {
    ami.action({
        'action': 'sippeers',
        'priority': 1
    });

    //totalCalls
    cdrDatabaseConnection.query("select count(dst) as calls from cdr WHERE calldate >= CURDATE()  AND (dcontext = 'from-internal' AND dstchannel LIKE '%OUT%' AND channel NOT LIKE '%@%')", function (error, totalCalls) {
        if (error) console.log(error.stack);
        io.emit('peers.totalCalls', totalCalls[0].calls);
    });

    cdrDatabaseConnection.query("select count(dst) as calls from cdr WHERE calldate >= CURDATE()  AND (dcontext = 'from-internal' AND dstchannel LIKE '%OUT%' AND channel NOT LIKE '%@%') AND disposition LIKE 'ANSWERED'", function (error, answeredCalls) {
        if (error) console.log(error.stack);
        io.emit('peers.answeredCalls', answeredCalls[0].calls);
    });

    cdrDatabaseConnection.query("select sum(billsec) as totalTalkTime from cdr WHERE calldate >= CURDATE() AND (dcontext = 'from-internal' AND dstchannel LIKE '%OUT%' AND channel NOT LIKE '%@%') " +
        "AND src in(" + global.activeAgentsList + ")", function (error, agentsAnsweredStats) {
        if (error) console.log(error.stack);
        io.emit('peers.agentsTotalTalks', agentsAnsweredStats);
    });

    cdrDatabaseConnection.query("select sum(billsec) / count(billsec) as averageTalkTime from cdr WHERE calldate >= CURDATE() AND (dcontext = 'from-internal' AND dstchannel LIKE '%OUT%' AND channel NOT LIKE '%@%') " +
        "AND src in(" + global.activeAgentsList + ")", function (error, agentsAnsweredStats) {
        if (error) console.log(error.stack);
        io.emit('peers.averageTalkTime', agentsAnsweredStats);
    });

    cdrDatabaseConnection.query("select src,count(disposition) as count from cdr WHERE calldate >= CURDATE() AND (dcontext = 'from-internal' AND dstchannel LIKE '%OUT%' AND channel NOT LIKE '%@%') " +
        "AND src in(" + global.activeAgentsList + ") group by src", function (error, agentTotalCalls) {
        if (error) console.log(error.stack);
        io.emit('peers.agentsTotalCalls', agentTotalCalls);
    });

    cdrDatabaseConnection.query("select src,count(disposition) as count from cdr WHERE calldate >= CURDATE() AND (dcontext = 'from-internal' AND dstchannel LIKE '%OUT%' AND channel NOT LIKE '%@%') " +
        "AND disposition = 'ANSWERED' AND src in(" + global.activeAgentsList + ") group by src", function (error, agentsAnsweredStats) {
        if (error) console.log(error.stack);
        io.emit('peers.agentsAnsweredStats', agentsAnsweredStats);
    });

    cdrDatabaseConnection.query("select src,count(disposition) as count from cdr WHERE calldate >= CURDATE() AND (dcontext = 'from-internal' AND dstchannel LIKE '%OUT%' AND channel NOT LIKE '%@%') " +
        "AND disposition in ('NO ANSWER','FAILED','BUSY') AND src in(" + global.activeAgentsList + ") group by src", function (error, agentsAnsweredStats) {
        if (error) console.log(error.stack);
        io.emit('peers.agentsFailedStats', agentsAnsweredStats);
    });

    cdrDatabaseConnection.query("select src,sum(billsec) as totalTalkTime from cdr WHERE calldate >= CURDATE() AND (dcontext = 'from-internal' AND dstchannel LIKE '%OUT%' AND channel NOT LIKE '%@%') " +
        "AND src in(" + global.activeAgentsList + ") group by src", function (error, agentsAnsweredStats) {
        if (error) console.log(error.stack);
        io.emit('peers.TotalTalks', agentsAnsweredStats);
    });

    cdrDatabaseConnection.query("select src,sum(billsec) / count(billsec) as averageTalkTime from cdr WHERE calldate >= CURDATE() AND (dcontext = 'from-internal' AND dstchannel LIKE '%OUT%' AND channel NOT LIKE '%@%') " +
        "AND src in(" + global.activeAgentsList + ") group by src", function (error, agentsAnsweredStats) {
        if (error) console.log(error.stack);
        io.emit('peers.averageTalk', agentsAnsweredStats);
    });

    setTimeout(checkAgentStatus, 10000);
};
