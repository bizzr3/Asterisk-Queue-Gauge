var app = angular.module('queueMonitor', []);

app.controller('outBoundController', ['$scope', '$filter', function ($scope, $filter) {
    $scope.peerslist = [];
    $scope.trunks = [];
    $scope.peersTotalStatus = [];
    $scope.todayMissedCalls = 0;
    $scope.todayAnsweredCalls = 0;
    $scope.todayTotalTalk = 0;
    $scope.averageTotalTalk = 0;
    $scope.activeCalls = 0;
    $scope.teams = {
        fresh_a: [2148, 2130, 2046, 2122, 2080, 2124, 2116, 2146, 2101, 2182, 2040],
        fresh_b: [2154, 2028, 2069, 2053, 2134, 2164, 2075, 2038, 2058, 2147, 2152, 2063],
        data_bank_a: [2067, 2171, 2060, 2181, 2115, 2168, 2001, 2151, 2135, 2004, 2128, 2102, 2170, 2166],
        data_bank_b: [2023, 2141, 2167, 2165, 2132, 2119, 2120, 2155, 2145, 2113, 2190, 2192],
        data_bank_c: [2006, 2002, 2094, 2195, 2144, 2005, 2022, 2071, 2123]
    };

    $scope.todayTotalCalls = 0;
    $scope.todayAnsweredCalls = 0;
    $scope.todayNoAnsweredCalls = 0;
    $scope.todayFailedCalls = 0;
    $scope.todayBusyCalls = 0;

    var socket = io();


    setInterval(function() {
        var active_slide = $('.table-slider li.active');
        if (active_slide.next().length == 0) {
            active_slide.removeClass('active');
            $('.table-slider li:first-child').addClass('active');
        } else {
            active_slide
                .removeClass('active')
                .next()
                .addClass('active');
        }
    },20000);

    socket.emit('peers.getList');

    socket.on('peer.statusChanged', function (data) {
        $scope.updatePeer(data)
    });

    socket.on('peers.list', function (data) {
        $scope.$apply(function () {
            $scope.peerslist = data;
        });
    });

    socket.on('peers.totalCalls', function (data) {
        $scope.$apply(function () {
            $scope.todayTotalCalls = data;
        });
    });

    socket.on('peers.answeredCalls', function (data) {
        $scope.$apply(function () {
            $scope.todayAnsweredCalls = data;
        });
    });

    socket.on('peers.agentsTotalTalks', function (data) {
        $scope.$apply(function () {
            $scope.todayTotalTalk = $scope.secondToTime(data[0].totalTalkTime);

        });
    });

    socket.on('peers.averageTalkTime', function (data) {
        $scope.$apply(function () {
            $scope.averageTotalTalk = $scope.secondToTime(data[0].averageTalkTime);

        });
    });


    socket.on('peers.agentsTotalCalls', function (data) {
        $scope.$apply(function () {
            data.forEach(function (item) {
                $scope.peerslist[$('.' + item.src).attr('list-index')].total_calls = item.count;
            });
        });
    });

    socket.on('peers.agentsAnsweredStats', function (data) {
        $scope.$apply(function () {
            data.forEach(function (item) {
                var index_ = $('.' + item.src).attr('list-index');
                var totalCalls_ = $scope.peerslist[index_].total_calls;
                var responseRate = item.count / totalCalls_;

                $scope.peerslist[index_].answered_calls = item.count;
                $scope.peerslist[index_].response_rate = responseRate;
            });
        });
    });

    socket.on('peers.TotalTalks', function (data) {
        $scope.$apply(function () {
            data.forEach(function (item) {
                $scope.peerslist[$('.' + item.src).attr('list-index')].totalTalk = $scope.secondToTime(item.totalTalkTime);
            });
        });
    });

    socket.on('peers.averageTalk', function (data) {
        $scope.$apply(function () {
            data.forEach(function (item) {
                $scope.peerslist[$('.' + item.src).attr('list-index')].averageTalk = $scope.secondToTime(item.averageTalkTime);
            });
        });
    });

    socket.on('peers.agentsBusyStats', function (data) {
        $scope.$apply(function () {
            data.forEach(function (item) {
                $scope.peerslist[$('.' + item.src).attr('list-index')].busy_calls = item.count;
            });
        });
    });

    socket.on('peers.agentsFailedStats', function (data) {
        $scope.$apply(function () {
            data.forEach(function (item) {
                $scope.peerslist[$('.' + item.src).attr('list-index')].failed_calls = item.count;
            });
        });
    });

    $scope.printFilters = function (value) {
        if (/^\d+$/.test(value))  return false;
        if (/Voicemail/.test(value))  return false;
        return true;
    };

    $scope.getProgressColorClass = function (value) {
        value *= 100;
        if (value < 10) {
            return 'progress-bar-danger';
        } else if (value >= 10 && value <= 40) {
            return 'progress-bar-warning';
        } else if (value >= 40 && value <= 70) {
            return 'progress-bar-info';
        } else if (value >= 70) {
            return 'progress-bar-success';
        }
    };

    $scope.updatePeer = function (itemToUpdate) {
        $scope.activeCalls = $('.blink').length - $('.blink.ng-hide').length;
        if (!Array.isArray(itemToUpdate)) {
            $scope.peerslist.filter(function (obj, index) {
                if (itemToUpdate.channel.indexOf(obj.extension) >= 0) {
                    $scope.$apply(function () {
                        switch (itemToUpdate.subevent) {
                            case 'Begin':
                            {
                                $scope.peerslist[index].status = 'In a call';
                                $scope.peerslist[index].destination = itemToUpdate.connectedlinenum;
                                clearInterval(angular.element('#' + $scope.peerslist[index].extension).attr('timerID'));
                                $scope.showTimer(angular.element('#' + $scope.peerslist[index].extension));
                                break;
                            }
                            case 'End':
                            {
                                $scope.peerslist[index].status = '';
                                $scope.peerslist[index].destination = '';
                                var timerElement = angular.element('#' + $scope.peerslist[index].extension);
                                timerElement.text('');
                                clearInterval(timerElement.attr('timerID'));
                                break;
                            }
                        }

                    });
                }
            });
        } else {
            $scope.peerslist.filter(function (obj, index) {
                $scope.$apply(function () {
                    if (!/OK/.test(itemToUpdate[index].status)) {
                        try {
                            $scope.peerslist[$('.' + itemToUpdate[index].objectname).attr('list-index')].status = itemToUpdate[index].status;
                        } catch(ex) {}
                    }
                });
            });
        }
    };

    $scope.showTimer = function (target) {
        var timer = 1;
        var minutes, seconds;

        var timerId = setInterval(function () {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            timer++;
            target.text('(' + minutes + ":" + seconds + ')');
        }, 1000);
        target.attr('timerID', timerId);
    };

    $scope.secondToTime = function (time) {
        var sec_num = parseInt(time, 10);
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours   < 10) {hours   = "0" + hours;}
        if (minutes < 10) {minutes = "0" + minutes;}
        if (seconds < 10) {seconds = "0" + seconds;}
        return hours + ':' + minutes + ':' + seconds;
    };

}]);

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
        for (var i = 0; i <= $scope.queueMembers.length - 1; i++) {
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

    $scope.sendReportEmail = function () {
        socket.emit('report.send');
    };

    socket.on('peer.statusChanged', function (newStatus) {

    });

    socket.on('report.sent', function (data) {
        alert('SENT');
    });

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

