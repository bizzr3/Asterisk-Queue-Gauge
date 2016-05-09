var app = angular.module('queueMonitor', []);

app.controller('QueueController', ['$scope', function ($scope) {
    $scope.customersInQueue = 0;
    $scope.QueuePerformace = 0;
    $scope.queueMembers = [];

    var socket = io();

    $scope.getStatusCssClassByCode = function (status) {
        var statusClass = '';
        switch (status) {
            case '1':
            {
                statusClass = 'status-not-inuse';
                break;
            }
            case '2':
            {
                statusClass = 'status-inuse';
                break;
            }
            case '3':
            {
                statusClass = 'status-busy';
                break;
            }
            case '4':
            {
                statusClass = 'status-unavail';
                break;
            }
            case '5':
            {
                statusClass = 'status-unavail';
                break;
            }
            case '6':
            {
                statusClass = 'status-ringing blink';
                break;
            }
            case '7':
            {
                statusClass = 'status-waiting blink';
                break;
            }
            case '8':
            {
                statusClass = 'status-holding blink';
                break;
            }
        }
        return statusClass;
    };

    $scope.getStatusTextByCode = function (status) {
        var statusText = '';
        switch (status) {
            case '1':
            {
                statusText = 'Ready';
                break;
            }
            case '2':
            {
                statusText = 'Talking';
                break;
            }
            case '3':
            {
                statusText = 'Busy';
                break;
            }
            case '4':
            {
                statusText = 'Unknown';
                break;
            }
            case '5':
            {
                statusText = 'Away';
                break;
            }
            case '6':
            {
                statusText = 'Ringing';
                break;
            }
            case '7':
            {
                statusText = 'Call Waiting';
                break;
            }
            case '8':
            {
                statusText = 'On Hold';
                break;
            }

        }
        return statusText;
    };

    $scope.calculateTotalCalls = function () {
        var total_ = 0;
        angular.forEach($scope.queueMembers, function (member) {
            total_ += member.callstaken * 1;
        });
        return total_;
    };

    $scope.getExtensionFromLocationURI = function (location) {
        if (location === '') return '';

        return location.split('@')[0].split('/')[1];

    };

    $scope.convertToDat = function (timestamp) {
        var date = new Date(timestamp * 1000);
        var hours = date.getHours();
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    };

    $scope.pushOrUpdateCID = function (queueEntry) {
        for (var i = 0; i <= $scope.queueMembers.length -1 ; i++) {
            if ($scope.queueMembers[i].location.indexOf(queueEntry.agent) > 0) {
                if ($scope.queueMembers[i].status !== '2') {
                    $scope.$apply(function () {
                        $scope.queueMembers[i].customerCid = queueEntry.cid;
                    });
                }
            } else {
                if ($scope.queueMembers[i].status !== '2') {
                    $scope.queueMembers[i].customerCid = '';
                }
            }
        }
    };

    $scope.pushOrUpdate = function (data) {
        if ($scope.queueMembers.length === 0) {
            $scope.$apply(function () {
                $scope.queueMembers.push(data);
            });
            return;
        }

        var itemUpdated = false;
        var queuelen = $scope.queueMembers.length - 1;
        for (var i = 0; i <= queuelen; i++) {
            if ($scope.queueMembers[i].location === data.location) {
                $scope.$apply(function () {
                    var cidTemp = '';
                    if ($scope.queueMembers[i].customerCid !== '' && data.status !== '1') {
                        cidTemp = $scope.queueMembers[i].customerCid;
                    }
                    $scope.queueMembers[i] = data;
                    $scope.queueMembers[i].customerCid = cidTemp;
                });
                itemUpdated = true;
                break;
            }
        }

        if (!itemUpdated) {
            $scope.$apply(function () {
                $scope.queueMembers.push(data);
            });
        }
    };

    socket.on('queue.callers', function (data) {
        $scope.customersInQueue = data;
        $('#ph').text($scope.customersInQueue);

        var waitingPoint = $('#queuecalls').highcharts().series[0].points[0];
        waitingPoint.update($scope.customersInQueue * 1);
    });

    socket.on('queue.servicelevelperf', function (data) {
        $scope.QueuePerformace = data;
        $('#performance_').text('%' + $scope.QueuePerformace);
    });

    socket.on('queue.income', function (data) {
        $scope.pushOrUpdateCID(data)
    });

    socket.on('queue.members', function (members) {
        $scope.pushOrUpdate(members);
        var totalCalls = $scope.calculateTotalCalls();
        $('#callsCount').text(totalCalls);
        var categories = [];

        angular.forEach($scope.queueMembers, function (member) {
            categories.push(member.name);
        });

        for (var i = 0; i <= $scope.queueMembers.length - 1; i++) {
            AgentCallsTakenchart.series[0].data[i].update(parseInt($scope.queueMembers[i].callstaken));
        }

        AgentCallsTakenchart.xAxis[0].setCategories(categories);
    });

    var gaugeOptions = {

        chart: {
            type: 'solidgauge',
            renderTo: 'queuecalls'
        },

        title: null,

        pane: {
            center: ['50%', '85%'],
            size: '140%',
            startAngle: -90,
            endAngle: 90,
            background: {
                backgroundColor: (Highcharts.theme && Highcharts.theme.background) || '#EEE',
                innerRadius: '60%',
                outerRadius: '100%',
                shape: 'arc'
            }
        },

        tooltip: {
            enabled: false
        },

        // the value axis
        yAxis: {
            stops: [
                [0.1, '#55BF3B'], // green
                [0.5, '#DDDF0D'], // yellow
                [0.9, '#DF5353'] // red
            ],
            lineWidth: 0,
            minorTickInterval: null,
            tickPixelInterval: 400,
            tickWidth: 0,
            title: {
                y: -70
            },
            labels: {
                y: 16
            }
        },

        plotOptions: {
            solidgauge: {
                dataLabels: {
                    y: 5,
                    borderWidth: 0,
                    useHTML: true
                }
            }
        }
    };

    var AgentCallsTakenchart = new Highcharts.Chart({

        chart: {
            renderTo: 'callsperagent',
            type: 'column',
        },
        title: {
            text: ''
        },
        xAxis: {
            categories: ['', '', '']
        },
        credits: {
            enabled: false
        },
        series: [{
            data: [0, 0, 0],
            name: 'Today calls per agent'
        }]

    });


    var callsCount = new Highcharts.Chart(Highcharts.merge(gaugeOptions, {
        yAxis: {
            min: 0,
            max: 20,
            title: {
                text: ''
            }
        },
        credits: {
            enabled: false
        },
        series: [{
            name: 'RPM',
            data: [1],
            dataLabels: {
                format: '<div style="text-align:center"><span style="font-size:25px;color:' +
                ((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') + '">{y:.0f}</span><br/>' +
                '<span style="font-size:12px;color:silver">* Customers</span></div>'
            },
            tooltip: {
                valueSuffix: ' revolutions/min'
            }
        }]

    }));
}]);
