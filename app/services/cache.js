var logger = require('../utils/logger');
var Promise = require('bluebird');
var redis = require('redis');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var TAG = '[CACHE SERVICE]';
var client = redis.createClient();

client.on('connect', function () {
    logger.log(TAG, 'service started.', 'warn');
});

client.watch('queue.members');

module.exports = {
    updateOrInsert: function (key, value) {
        client.set(key, value);
    },
    findOrFail: function (key) {
        console.log(client.hgetall(key));
    }
};
