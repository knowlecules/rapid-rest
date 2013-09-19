/**
 * Created with JetBrains WebStorm.
 * User: jrudland
 * Date: 26/06/12
 * Time: 11:02 PM
 * To change this template use File | Settings | File Templates.
 */
var http = require('http'),
    url = require('url'),
    domain = require('domain'),
    cluster = require('cluster');

module.exports = function (options) {
    /* Syntax to enable the following invocation signature :
     routes('/my_path')('get', myFunc);
     */
    var self = this, opts = options || {}, rest = function (route, isCaseInsensitive) {
        return rest.handlers(rest.router.add(route, isCaseInsensitive));
    };
    self.allocateCPUs = opts.allocateCPUs || 2;
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
                    req.on('error', function (err) {
                        // Client did something bizarre;
                        // req.connection.destroy();
                    });
                    fn(req, res, segments);
                };
            } else {
                // Expecting POST or PUT verb
                route.methods[verb] = function (req, res, segments) {
                    var body = '';
                    // Data accepting event
                    req.on('error', function (err) {
                        // Client did something bizarre;
                        // req.connection.destroy();
                    });
                    req.on('data', function (data) {
                        body += data;
                        if (body.length > 1e6) {
                            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                            req.connection.destroy();
                        }
                    });
                    req.on('end', function () {
                        var data, files;
                        // For performance reasons will only ever support JSON
                        if (/application\/json/i.test(req.headers["content-type"])) {
                            try {
                                // Invoke the callback
                                data = (!body.length) ? null : JSON.parse(body);
                                fn(req, res, segments, data);
                            } catch(ejson) {
                                res.write("ERROR: Could not parse body as json.\n\n" + body);
                                res.end();
                            }
                        } else {
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
            add : function (urlPath, isCaseInsensitive) {
                //Performance gains are made here by setting up all variables required for the runtime service
                var urlDef = url.parse(urlPath, true),
                    urlMatch = urlDef.pathname.replace(/[\-\[\]\{\}\(\)\*\+\?\.,\/\\\^\$\|#\s]/g, "\\$&").replace(/(:[^(\\/)]+)/g, "([^/\\?]*)"),
                    paramKeys = (urlPath.indexOf("/:") > -1) ? urlDef.pathname.replace(/(\/[^:][^\/]+)/g, '').substr((urlPath[0] === '^') ? 3 : 2).split("/:") : [],
                    queryKeys = urlDef.query;

                //QueryStrings are optional and not included in the match
                if (urlPath.indexOf("?") === -1) {
                    urlMatch += "(?=\\?.*|$)";
                }
                //Remove escaped reserved '^' character
                if (urlPath[0] === '^') {
                    urlMatch = urlMatch.substr(1);
                }
                rest.matchDefs[urlMatch] = rest.matchDefs[urlMatch] || {re: new RegExp(urlMatch, isCaseInsensitive ? "i" : ""), paramKeys: paramKeys, queryKeys: queryKeys, methods: {}};
                return rest.matchDefs[urlMatch];
            },
            handle : function (req, res) {
                var paramKeys, urlDef, pattern, key, ikey, matchDef, urlParams, queryMatch,
                    method = req.method.toLowerCase(),
                    location = routes,
                    urlPath = req.url,
                    params = {};

                //Optimization for URLs that have no query string
                if (req.url.indexOf("?") >= 0) {
                    urlDef =  url.parse(req.url, true);
                    urlPath = urlDef.pathname;
                    req.query = urlDef.query;
                }

                // Search for matching pattern
                for (pattern in rest.matchDefs) {
                    matchDef = rest.matchDefs[pattern];
                    urlParams = urlPath.match(matchDef.re);

                    // Successful match
                    if (urlParams !== null) {
                        // If required, validate querystring contains the required value pairs
                        queryMatch = true;
                        if (urlDef && matchDef.queryKeys) {
                            for (key in matchDef.queryKeys) {
                                if (!urlDef.query.hasOwnProperty(key)) {
                                    queryMatch = false;
                                }
                                // Copy query string key pairs to params collection
                                params[key] = req.query[key];
                            }
                        }

                        // Align parameters in the URL with the names from the service definition
                        paramKeys = rest.matchDefs[pattern].paramKeys;
                        for (ikey = 0; ikey < paramKeys.length; ikey++) {
                            params[paramKeys[ikey]] = urlParams[ikey + 1];
                        }

                        // Assign the route if the entire pattern matches
                        if (queryMatch) {
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
        var server, icpu;
        if (cluster.isMaster && self.allocateCPUs > 1) {
            for (icpu = 0; icpu < self.allocateCPUs; icpu++) {
                cluster.fork();
            }

            cluster.on('disconnect', function (worker) {
                console.error('disconnect!');
                cluster.fork();
            });

        } else {
            server = http.createServer(function (req, res) {
                var d = domain.create();
                d.on('error', function (er) {
                    console.error('error', er.stack);
                    try {
                        var killtimer = setTimeout(function () {
                            process.exit(1);
                        }, 10000);
                        // process.unref();
                        // stop taking new requests.
                        server.close();

                        // When allocating more than 1 CPU
                        if (cluster.worker) {
                            cluster.worker.disconnect();
                        }
                        if (!res.headersSent) {
                            res.statusCode = 500;
                            res.setHeader('content-type', 'text/plain');
                            res.end('Oops, there was a problem!\n');
                        }
                    } catch (er2) {
                        // oh well, not much we can do at this point.
                        console.error('Error sending 500!', er2.stack);
                    }
                });
                d.add(req);
                d.add(res);

                d.run(function () {
                    rest.router.handle(req, res);
                });
            });
            server.listen(host, port, cb);
        }
    };

    return rest;
};