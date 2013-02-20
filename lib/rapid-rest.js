/**
 * Created with JetBrains WebStorm.
 * User: jrudland
 * Date: 26/06/12
 * Time: 11:02 PM
 * To change this template use File | Settings | File Templates.
 */
var http = require('http');
var url = require('url');


module.exports = function () {
    /* Syntax to enable the following invocation signature :
      routes('/my_path')('get', myFunc);
    */
    var rest = function (route) {
        return rest.handlers(rest.router.add(route));
    };
    rest.matchDefs = {};
    rest.methods = {};
    rest.respond = function (res, code, headers, data) {
        // Handles empty responses more gracefully for feedback purposes
        if (code && headers && !data) {
            data = headers;
            headers = {};
        } else if (code && !headers && !data) {
            data = code;
            code = 200;
            headers = {};
        }

        // Ready the package
        if (typeof data === 'object') {
            data = JSON.stringify(data);
            headers['Content-type'] = headers['Content-type'] || 'application/json';
        }

        // Playing nice header that's not really required
        if (!headers['Content-length'] && typeof data === 'string') {
            headers['Content-length'] = data.length;
        }

        res.writeHead(code, headers);
        res.end(data);
    };
    rest.handlers = function (route){
        // Create options collection if it doesn't exist
        route.methods.options = route.methods.options || function (req, res, params) {
            var methods = Object.keys(route.methods).filter(function (key) {
                return key !== 'options';
            });
            rest.respond(res, 200, methods);
        };

        // Request services are found at the intersection of service pattern and verb name
        route.method = function (rawVerb, accept, fn) {

            // Handle overloads
            if (rawVerb && accept && !fn) {
                fn = accept;
                accept = null;
            }

            var verb = rawVerb.toLowerCase();
            if (verb[0] !== 'p') {
                // verbs that don't send data such as GET, SEARCH
                route.methods[verb] = function (req, res, segments) {
                    fn(req, res, segments);
                };
            }else{
                // Expecting POST or PUT verb
                route.methods[verb] = function (req, res, segments) {
                    var body = '';
                    // Data accepting event
                    req.on('data', function (data) {
                        body += data;
                        if (body.length > 1e6) {
                            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                            req.connection.destroy();
                        }
                    });
                    req.on('end', function () {
                        var data,files;
                        // For performance reasons will only ever support JSON
                        if(/application\/json/i.test(req.headers["content-type"])){
                            try{
                                // Invoke the callback
                                data = JSON.parse(body);
                                fn(req, res, segments, data);
                            }catch(ejson){
                                res.write("ERROR: Could not parse body as json.\n\n" + body);
                                res.end();
                            }
                        }else{
                            res.write("ERROR: Content-type not supported:" + req.headers["content-type"]);
                            res.end();

                        }
                    });
                };
            }
            return route.method;
        };
        return route.method;
    };

    // Routes to be handled
    rest.router = (function () {
        var routes = {};

        return {
            add : function (urlPath) {
                //Performance gains are made here by setting up all variables required for the runtime service
                var urlDef = url.parse(urlPath, true);
                var urlMatch = urlDef.pathname.replace(/[\-\[\]\{\}\(\)\*\+\?\.,\/\\\^\$\|#\s]/g, "\\$&").replace(/(:[^(\\/)]+)/g,"([^/]*)");
                var patternRE = new RegExp(urlMatch);
                var paramKeys = (urlPath.indexOf("/:") > -1) ? urlDef.pathname.replace(/(\/[^:][^\/]+)/g, '').substr(2).split("/:") :[];
                var queryKeys = urlDef.query;

                rest.matchDefs[urlMatch] = rest.matchDefs[urlMatch] || {re:patternRE, paramKeys:paramKeys, queryKeys:queryKeys, methods:{}};
                return rest.matchDefs[urlMatch];
            },
            handle : function (req, res) {
                var paramKeys, urlDef, pattern, key, ikey;
                // Handle options
                var method = req.method.toLowerCase();

                var location = routes;
                var urlPath = req.url;
                var params={};

                //Optimization for URLs that have no query string
                if(req.url.indexOf("?")>=-1){
                    urlDef =  url.parse(req.url,true);
                    urlPath = urlDef.pathname;
                    req.query = urlDef.query;
                }

                // Search for matching pattern
                for (pattern in rest.matchDefs) {
                    var matchDef = rest.matchDefs[pattern];
                    var urlParams = urlPath.match(matchDef.re);

                    // Successful match
                    if ( urlParams !== null){
                        // If required, validate querystring contains the required value pairs
                        var queryMatch = true;
                        if(urlDef && matchDef.queryKeys){
                            for(key in matchDef.queryKeys)  {
                                if(!urlDef.query[key]){
                                    queryMatch = false;
                                }
                            }
                        }

                        // Align parameters in the URL with the names from the service definition
                        paramKeys = rest.matchDefs[pattern].paramKeys;
                        for(ikey=0; ikey < paramKeys.length; ikey++)  {
                            params[paramKeys[ikey]] = urlParams[ikey + 1];
                        }

                        // Assign the route if the entire pattern matches
                        if(queryMatch){
                            location = rest.matchDefs[pattern];
                        }
                        break;
                    }
                }

                // The service has not been defined
                if (!location.methods || !location.methods[method]) {
                    return rest.respond(res, 501, {'Content-type' : 'text/plain'}, 'Not Implemented');
                }

                location.methods[method](req, res, params);

            }
        };
    }());

    rest.listen = function (host, port, cb) {
        http.createServer(rest.router.handle).listen(host, port, cb);
    };

    return rest;
};