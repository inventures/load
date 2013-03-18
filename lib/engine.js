exports.generateRandomTest = function (input, username, time) {
    var requests = [];

    input.requests.forEach(function(request) {
        var r = {
            time: parseInt((Math.random() * request.time) * time),
            request: {
                method: request.request.method,
                url: request.request.url
            }
        };

        if(r.request.method === 'POST') r.request.form = request.request.form || {}

        if(username) r.request.url += (r.request.url.indexOf('?') > -1 ? '&':'?') + '_username=' + username;
        else if(request.usernameRequired) return;

        if(Math.random() < request.weight) requests.push(r);
    });

    return requests;
};