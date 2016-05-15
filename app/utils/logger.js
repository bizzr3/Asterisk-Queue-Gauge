var log4js = require('log4js');
var logForJS = log4js.getLogger();

module.exports = {
    log: function(title, log, type) {
        if (!global.debuggable) {
            return;
        }

        if (type === '' || type === undefined) {
            logForJS.info(title, typeof log === 'undefined' ? '' : log);

            return;
        }

        logForJS[type](title, typeof log === 'undefined' ? '' : log);
    }
};
