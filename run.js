var request = require('request');
var yaml = require('js-yaml');
var _ = require('underscore');
var engine = require('./lib/engine');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

//get the command line arguments in a nice object
var argv = require('optimist').argv;
var args = {
    visitors: argv._[0]
};

function run(visitors) {
    var all = [];
    var dynos = 0;
    var index = 1;

    var usernames = require('./tests/usernames.yml');
    var data = require('./tests/basic.yml');

    for(var i=0; i<(visitors || data.visitors); i++) {
        //ramp up towards the end of the load test
        var time = Math.min(1, -Math.log(1- i/(visitors || data.visitors)));
        time = parseInt((time * data.time * .9) + (i/(visitors || data.visitors) * data.time *.1));

        requests = engine.generateRandomTest(data, usernames[parseInt(Math.random() * usernames.length)], time);    
        requests.forEach(function(request) {
            all.push(request);
        });
    }

    var start = new Date().getTime();

    all.forEach(function(req) {
        setTimeout(function() {
            var params = {
                url: data.host + req.request.url,
                method: req.request.method,
                form: req.request.form
            };

            var time = new Date().getTime();

            request(params, function (err, res, data) {
                var output = {
                    id: index++,
                    total: all.length,
                    timestamp: req.time,
                    time: new Date().getTime() - time,
                    statusCode: res.statusCode,
                    url: req.request.url
                };

                if(parseInt(res.headers['x-render-time'])) {
                    output.time = parseInt(res.headers['x-render-time']);
                } 
                else {
                    console.log(output.id + ' = ' + output.time);
                }

                console.log(JSON.stringify(output));
            });    
        }, req.time);
    });

    //exit after end of requests
    setTimeout(process.exit, data.time * 1.05);
}

if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    return;
}

run(args.visitors);
