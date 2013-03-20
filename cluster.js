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
var visitorsPerDyno = 2000;
var dynoCost = 0.05 / 60 / 60;
var requestsPerSecPerVisitor = 1/20;

//get the command line arguments in a nice object
var argv = require('optimist').argv;
var args = {
    visitors: argv._[0]
}

var dynos = Math.max(1, parseInt(args.visitors / visitorsPerDyno));
var cost = Math.round(dynos * dynoCost * periods * 1000) / 1000;

function startDyno (visitors) {
    console.log('Starting Dyno load process with ' + visitors + ' virtual users per core');

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
        path: '/apps/' + applicationName + '/logs?logplex=true&tail=1&num=0',
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
    var authenticated = 0;
    var cached = 0;
    var count = 0;
    var errors = 0;
    var last = 0;
    var queue = [];
    var series = [];
    var start = new Date().getTime();
    
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

                try {
                    var data = JSON.parse(line.substring(line.indexOf('{')));
                    
                    if(data.statusCode != 200) {
                        errors ++;
                    }
                    total++;

                    if(data.url.indexOf('?_username') > -1) authenticated ++;
                    if(data.cached) cached ++;

                    queue.push(data);
                } catch (e) {
                    //don't error here
                }
            });
        });

        res.on('end', function() {
            console.log('END');
        });
    };

    //summarisies stats over a given period
    var counter = function () {
        series.push(queue);
        queue = [];
        if(series.length > periods) series = series.slice(-periods);

        //clear console
        console.log('\033[2J');

        //generate output data
        var totalRequests = 0;
        var totalTime = 0;
        var errors = 0;
        var seconds = parseInt((new Date().getTime() - start) / 1000);

        series.forEach(function(queue) {
            queue.forEach(function(data) {
                totalRequests ++;
                totalTime += data.time;
                if(data.statusCode != 200) errors ++;
            });
        });

        var perSecond = totalRequests / Math.min((periods * interval) * 1000, seconds);
        var perMinute = perSecond * 60;
        var perHour = perMinute * 60;
        var perDay = perHour * 24;
        var perMonth = perDay * 30;
        var perYear = perDay * 365;
        var visitors = perSecond / requestsPerSecPerVisitor;

        console.log('Total dynos: ' + dynos);
        console.log('Total cost: $' + cost);
        console.log('Running time: ' + seconds + 's');

        console.log('---------------')

        console.log('Active visitors: ' + formatNumber(visitors));
        console.log('Total requests: ' + formatNumber(total));
        console.log('Authenticated requests: ' + formatNumber(authenticated));
        console.log('Cached requests: ' + formatNumber(cached));
        console.log('Errors: ' + formatNumber(errors) + ' / ' + (100*errors/total) + '%');

        console.log('---------------');

        console.log('Per second: ' + formatNumber(perSecond));
        console.log('Per minute: ' + formatNumber(perMinute));
        console.log('Per hour: ' + formatNumber(perHour));
        console.log('Per day: ' + formatNumber(perDay));
        console.log('Per month: ' + formatNumber(perMonth));
        console.log('Per year: ' + formatNumber(perYear));

        console.log('---------------');
        
        console.log('Response time: ' + parseInt(totalTime / (totalRequests || 1)) + 'ms');
        
        if(count++ > periods * 1.1) {
            clearTimeout(timer);
            process.exit();
        }
    };

    var req = https.request(options, responseHandler);
    req.write('');
    req.end();

    var timer = setInterval(counter, interval);
}


//start heroku dynos
for(var i=0; i<dynos; i++) {
    startDyno(Math.min(args.visitors / 4, visitorsPerDyno / 4));
}

//start logging
tail();


formatNumber = function formatNumber(num) {
    if(num === null || num === undefined) {
        return 0;
    } else if(num >= 1000000000) {
        return Math.round(num / 100000000) / 10 + 'b';
    } else if(num > 1000000) {
        return Math.round(num / 100000) / 10 + 'm';
    } else if(num > 5000) {
        return Math.round(num / 100) / 10 + 'k';
    } else {
        return parseInt(num);
    }
};  
