var request = require('request');
var yaml = require('js-yaml');
var _ = require('underscore');
var engine = require('./lib/engine');

function run() {
    var all = [];
    var concurrent = 40;
    var dynos = 0;

    var usernames = require('./tests/usernames.yml');
    var data = require('./tests/basic.yml');

    for(var i=0; i<data.visitors; i++) {
        requests = engine.generateRandomTest(data, usernames[parseInt(Math.random() * usernames.length)], data.time);    
        requests.forEach(function(request) {
            all.push(request);
        });
    }

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
    
    for(var i=0; i<Math.min(10, all.length); i++) {
        console.log(JSON.stringify(all[i]));
    }

    console.log('...');
}

run();

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
