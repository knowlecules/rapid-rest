var http = require('http');

var MAX_ITERATIONS = 1;
var port =8004;

var surveys = [
    {name:"Survey1", user: "UserA", answers:{"Q1":1,"Q2":2,"Q3":2,"Q4":2,"Q5":2,"Q6":2,"Q7":2,"Q8":2,"Q9":2,"Q10":2,"Q11":2,"Q12":2,"Q13":2,"Q14":2}},
    {name:"Survey2", user: "UserB", answers:{"Q1":1,"Q2":2,"Q3":2,"Q4":2,"Q5":2,"Q6":2,"Q7":2,"Q8":2}},
    {name:"Survey3", user: "UserC", answers:{"Q1":1,"Q2":2,"Q3":2,"Q4":2,"Q5":2,"Q6":2,"Q7":2,"Q8":2,"Q9":2,"Q10":2}}
]

var options = {
    host: 'localhost',
    port: port,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }};

// calling here
var collection = "here";
var survey = surveys[0];
options.path = '/' +collection+ '/'+ survey.name + '/' + survey.user;

var req = http.request(options, function(res) {
    if(res.statusCode != 201){
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
    }else{
        console.log('SUCCESS');
    }
    res.setEncoding('utf8');

    res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
    });
});


req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
});

// write data to request body
req.write(JSON.stringify(survey.answers));
req.end();

// calling there
var collection = "there";
var survey = surveys[1];
options.path = '/' +collection+ '/'+ survey.name + '/';

var req = http.request(options, function(res) {
    if(res.statusCode != 201){
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
    }else{
        console.log('SUCCESS: ' + JSON.stringify(res.headers));
    }
    res.setEncoding('utf8');

    res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
    });
});


req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
});

// write data to request body
req.write(JSON.stringify(survey.answers));
req.end();

console.log(" interacting on port:" + port);