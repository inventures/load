var request = require('request');
var yaml = require('js-yaml');
var _ = require('underscore');
var engine = require('./lib/engine');

function run() {
    var all = [];
    var dynos = 0;
    var index = 1;

    var usernames = require('./tests/usernames.yml');
    var data = require('./tests/basic.yml');

    for(var i=0; i<data.visitors; i++) {
        requests = engine.generateRandomTest(data, usernames[parseInt(Math.random() * usernames.length)], data.time);    
        requests.forEach(function(request) {
            all.push(request);
        });
    }

    all.forEach(function(req) {
        setTimeout(function() {
            var params = {
                url: data.host + req.request.url,
                method: req.request.method,
                form: req.request.form
            };

            var time = new Date().getTime();

            request(params, function (err, res, data) {
                console.log(pad(index++, 5) + '/' + all.length + '  ' + pad(req.time / 1000, 7) + 's : ' + pad((new Date().getTime() - time) / 1000, 5) + 's : ' + res.statusCode + ' = ' + req.request.url);    
            });    
        }, req.time);
    });
}

run();

/*
function server() {
    dynos = Math.max(1, parseInt(all.length / (concurrent * data.time / 1000)));

    console.log('Initialising load test');
    console.log('------------------------');
    console.log('Total visitors = ' + formatNumber(data.visitors));
    console.log('Time = ' + data.time / 1000 + 's');
    console.log('Total requests = ' + formatNumber(all.length));
    console.log('Per day = ' + formatNumber(all.length / data.time * 1000 * 60 * 60 * 24));
    console.log('Per month = ' + formatNumber(all.length / data.time * 1000 * 60 * 60 * 24 * 30));
    console.log('Per year = ' + formatNumber(all.length / data.time * 1000 * 60 * 60 * 24 * 365));
    console.log('Dynos required = ' + dynos);
    console.log('------------------------');
}
 */

function pad(str, len) {
    for(var i=0; i<len; i++) {
        str = ' ' + str;
    }

    return str.slice(-len);
};

function formatNumber(num) {
    if(num === null || num === undefined) {
        return 0;
    } else if(num >= 1000000000) {
        return Math.round(num / 100000000) / 10 + 'b';
    } else if(num > 1000000) {
        return Math.round(num / 100000) / 10 + 'm';
    } else if(num > 1000) {
        return Math.round(num / 100) / 10 + 'k';
    } else {
        return num;
    }
};  
