module.exports = {
    defaults: {
        eventTypes: {
            EVENT_MAIN_CALL: '',
            EVENT_HANGUP: ''
        }
    },
    debuggable: false,
    eventSendInterval: 1000,
    bugSnag: {
        enabled: false,
        api_key: ''
    },
    endpoints: {
        nopickup: ''
    },
    asteriskConnection: {
        username: '',
        password: '',
        ip_address: '',
        port: '5038',
        enabled: false
    },
};
