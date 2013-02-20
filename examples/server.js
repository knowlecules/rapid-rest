var routes = require("../lib/rapid-rest")();
var port = 8004;

/* Accepts a POST at URL matching /here/?A?/?B?
params.here_name = ?A?
params.user = ?B?
*/
routes('/here/:here_name/:user')
    ('post', function(req, res, params, jsonData){
        here(req, res, params, jsonData);
    });
	
	
/* Accepts a POST at URL matching /there/?A?
params.over_name = ?A?
*/
routes('/there/:over_name')
    ('post', function(req, res, params, jsonData){
        there(req, res, params, jsonData);
    });
routes.listen(port);

/* Attempts to miss-match
 params.level_name != params.level
 */
routes('/callback/:table_name?level_name={level_name}&callback={callback}')
    ('get', function(req, res, params, jsonData){
        callbackWords(req, res, params, jsonData);
    });

var interval;
function here(req, res, params, bodyContents) {
	var msg = "got 'here'";
	console.log(msg);
	console.dir(bodyContents);
	console.dir(params);	
    
	res.writeHead(201, '', {'Content-Type': 'text/html'});
    res.end(msg);
};

function there(req, res, params, bodyContents) {
	var msg = "went 'there'";
	console.log(msg);
	console.dir(bodyContents);
	console.dir(params);	

    res.writeHead(201,'' , {'Content-Type': 'text/html'});
    res.end(msg);
};

function callbackWords(req, res, params, bodyContents) {
    var msg = "went 'callbackwords'";
    console.log(msg);
    console.dir(bodyContents);
    console.dir(params);

    res.writeHead(201,'' , {'Content-Type': 'text/html'});
    res.end(msg);
};

console.log(" listening on port:" + port);