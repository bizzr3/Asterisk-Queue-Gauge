var express = require('express');
var routes = express.Router();

// Routes:
routes.get('/', function (req, res) {
   res.render('index', {
      title: 'Queue Metric',
       partials: {
       }
   });
});

routes.get('/outbound', function() {
    res.render('outbound', {
        title: 'Outbound Metrics',
        partials: {
            header: 'header',
            navbar: 'navbar',
            posts: 'posts',
            footer: 'footer',
        }
    })
});


module.exports = routes;
