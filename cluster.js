var request = require('request');
var yaml = require('js-yaml');
var _ = require('underscore');
var engine = require('./lib/engine');
var url = require('url');
var querystring = require('querystring');
var https = require('https');

//heroku log api call
var applicationName = 'entrago-load';
var apiKey = '427684cd6debb0218a4a8089c296205a7c0c7c63';

//count requests for the last n milliseconds
var periods = 60;
var interval = 1000;

//number of visitors per dyno
var visitorsPerDyno = 100;

//get the command line arguments in a nice object
var argv = require('optimist').argv;
var args = {
    visitors: argv._[0]
}

function startDyno (visitors) {
    var data = querystring.stringify({
        command: 'node run ' + visitors
    });

    var headers = {
        Accept: "application/json",
        Authorization: new Buffer(':' + apiKey).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
    };

    var options = {
        headers: headers,
        hostname: 'api.heroku.com',
        path: '/apps/' + applicationName + '/ps',
        method: 'POST'
    };

    var req = https.request(options, function (res) {
        res.on('data', function(data) {
            console.log(data);
        });
    });

    req.write(data);
    req.end();
}

//tails logs and starts the log consume function
function tail () {
    var headers = {
        Accept: "application/json",
        Authorization: new Buffer(':' + apiKey).toString('base64')
    };

    var options = {
        headers: headers,
        hostname: 'api.heroku.com',
        path: '/apps/' + applicationName + '/logs?logplex=true&ps=router&tail=1&num=0',
        method: 'GET'
    };

    var req = https.request(options, function (res) {
        res.on('data', function(url) {
            consume(url);
        });
    });

    req.end();
}

//consumes heroku logs
function consume (data) {
    var address = url.parse('' + data);

    var buffer = '';
    var total = 0;
    var last = 0;
    var queue = [];
    var dynos = {};

    var options = {
        host: address.host,
        path: address.path
    };

    //consumes data from the heroku logging service
    var responseHandler = function (res) {
        res.on('data', function(chunk) {
            var lines = ('' + chunk).split('\n');

            lines.forEach(function(line) {
                if(line.indexOf('{') == -1) return;
                queue.push(JSON.parse(line.substring(line.indexOf('{'))));
            });
        });

        res.on('end', function() {
            console.log('END');
        });
    };

    //summarisies stats over a given period
    var counter = function () {
        var current = total - last;

        //clear console
        console.log('\033[2J');

        
    };

    var req = https.request(options, responseHandler);
    req.write('');
    req.end();

    setInterval(counter, interval);
}


//start heroku dynos
for(var i=0; i<Math.max(1, args.visitors / visitorsPerDyno); i++) {
    startDyno(visitorsPerDyno);
}

//start logging
tail();