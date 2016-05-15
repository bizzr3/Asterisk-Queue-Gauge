var nodemailer = require('nodemailer');
var redis = require('redis');
var redisClient = redis.createClient();
var json2csv = require('json2csv');
var mysql = require('mysql');

var timeStampToDat = function (timestamp) {
    var date = new Date(timestamp * 1000);
    var hours = date.getHours();
    var minutes = "0" + date.getMinutes();
    var seconds = "0" + date.getSeconds();
    return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
};

var databaseConnection = mysql.createConnection({
    host: '10.59.0.13',
    user: 'asteriskuser',
    password: 'amp109',
    database: 'asteriskcdrdb'
});

module.exports = {
    sendMetricEmail: function () {
        redisClient.get('queue.members', function (error, queueAgentsDataSet) {
            if (error) return;

            var agentsList = JSON.parse(queueAgentsDataSet);
            var todayTotalCalls = 0;
            var queuePerformance = 0;
            var cdr = [];

            redisClient.get('queue.totalCalls', function (error, totalCalls) {
                if (error) return;
                todayTotalCalls = totalCalls;
                redisClient.get('queue.performance', function (error, serviceLevel) {
                    if (error) return;
                    queuePerformance = serviceLevel;

                    databaseConnection.connect(function (err) {
                        if (err) return;
                        console.log(err);
                        databaseConnection.query("SELECT * FROM cdr WHERE calldate >= CURDATE() AND (channel LIKE '%queue%') order by billsec DESC;", function (error, cdr) {
                            if (error) return;
                            console.log(cdr);
                            var html_ = '<p>Hello, here you can find the Call Center inbound statistics</p><br>';
                            html_ += '<h3>Inbound Team Performance:</h3>' + queuePerformance + '%<br>';
                            html_ += '<h3>Total Calls:</h3>' + todayTotalCalls + '<br>';
                            html_ += '<h3>Agents:</h3><br>';
                            html_ +=
                                '<table border="1">' +
                                '<thead>' +
                                '<tr>' +
                                '<th>Name</th>' +
                                '<th>Extensions</th>' +
                                '<th>Last Call</th>' +
                                '<th>Answered Calls</th>' +
                                '</tr>' +
                                '</thead>' +
                                '<tbody>';

                            agentsList.forEach(function (agent) {
                                html_ +=
                                    '<tr>' +
                                    '<td>' + agent.name + '</td>' +
                                    '<td>' + agent.location.split('@')[0].split('/')[1] + '</td>' +
                                    '<td>' + timeStampToDat(agent.lastcall) + '</td>' +
                                    '<td>' + agent.callstaken + '</td>' +
                                    '</tr>';
                            });

                            html_ += '</tbody>' +
                                '</table><br>' +
                                '<h3>Please find attached report file:</h3>';

                            var fields = ['calldate', 'src', 'dst', 'disposition', 'duration', 'billsec'];
                            var fieldNames = ['Date', 'Source', 'Destination', 'Cause', 'duration', 'Talk Duration'];

                            json2csv({data: cdr, fields: fields, fieldNames: fieldNames}, function (err, csv) {
                                if (err) return;
                                var transporter = nodemailer.createTransport('smtps://mojtaba.bdt@gmail.com:C0ncentrationaBC@smtp.gmail.com');

                                var mailOptions = {
                                    from: '"Call Center Care" <Qu>', // sender address
                                    to: 'mojtaba.bakhtiaree@gmail.com', // list of receivers
                                    subject: 'Call Center Status', // Subject line
                                    text: 'Here you can find the status', // plaintext body
                                    html: html_,
                                    attachments: [{'filename': 'cdr.csv', 'content': csv}]
                                };

                                transporter.sendMail(mailOptions, function (error, info) {
                                    if (error) {
                                        return console.log(error);
                                    }
                                    console.log('Message sent: ' + info.response);
                                });
                            });

                        });
                    });
                });
            });
        });
    }
};
