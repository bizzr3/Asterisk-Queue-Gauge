module.exports = {
    defaults: {
        eventTypes: {
            EVENT_MAIN_CALL: 'main_call',
            EVENT_HANGUP: 'hangup'
        }
    },
    debuggable: true,
    eventSendInterval: 3000,
    asteriskConnection: {
        username: 'app',
        password: 'b@01038385',
        ip_address: '10.59.0.13',
        port: '5038',
        enabled: true
    }
};
