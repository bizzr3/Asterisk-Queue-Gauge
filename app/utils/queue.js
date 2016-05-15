var redis = require('redis').createClient();
var logger = require('./logger');

module.exports = {
    calculateTotalCalls: function () {
        var callstaken_ = 0;
        global.agents.forEach(function (agent) {
            callstaken_ += (agent.callstaken * 1);
        });
        global.agentsTakenCalls = callstaken_;
        redis.set('queue.totalCalls', global.agentsTakenCalls, redis.print);
        //global.verboseMode && logger.log('TOTAL CALLS: ', JSON.stringify(global.agentsTakenCalls));
    },
    updateQueuePerformace: function (serviceLevel) {
        redis.set('queue.performance', serviceLevel, redis.print);
    },
    updateAgentsList: function (newItemRequestObject) {
        if (global.agents.length == 0) {
            global.agents.push(newItemRequestObject);
            return;
        }

        var i = 0;
        var updated = false;
        global.agents.forEach(function (agent) {
            if (agent.location === newItemRequestObject.location) {
                global.agents[i] = newItemRequestObject;
                updated = true;
            }
            i++;
        });

        if (!updated) {
            global.agents.push(newItemRequestObject);
        }

        this.calculateTotalCalls();
        redis.set('queue.members', JSON.stringify(global.agents), redis.print);
        //global.verboseMode && logger.log('MEMBERS saved.', JSON.stringify(global.agents));
    }
};
