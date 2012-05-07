var http = require('http');

module.exports = function() {
    var rest = function(route) {
        return rest.handlers(rest.router.add(route));
    };
    rest.matchDefs = {};
    rest.respond = function(res, code, headers, data) {
        if (code && headers && !data) {
            data = headers;
            headers = {};
        } else if (code && !headers && !data) {
            data = code;
            code = 200;
            headers = {};
        }

        if (typeof data === 'object') {
            data = JSON.stringify(data);
            headers['Content-type'] = headers['Content-type'] || 'application/json';
        }

        if (!headers['Content-length'] && typeof data === 'string') {
            headers['Content-length'] = data.length;
        }

        // TODO: streams, json, html (look for <)
        res.writeHead(code, headers);
        res.end(data);
    }
    rest.handlers = function(route){
        route.methods = route.methods || {};

        route.methods.options = route.methods.options || function(ctx) {
            var methods = Object.keys(route.methods).filter(function(key) {
                return key !== 'options';
            });

            ctx.respond(200, methods);
        };

        route.method = function(rawVerb, accept, fn) {

            if (rawVerb && accept && !fn) {
                fn = accept;
                accept = null
            }

            var verb = rawVerb.toLowerCase();
            if (verb[0] != 'p') {
                route.methods[verb] = function(req, res, segments) {
                    fn(req, res, segments);
                };
            }else{
                route.methods[verb] = function(req, res, segments) {
                    var body = '';
                    req.on('data', function (data) {
                        body += data;
                        if (body.length > 1e6) {
                            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                            req.connection.destroy();
                        }
                    });
                    req.on('end', function () {
                        //TODO: Switch contentType

                        var data = body;// JSON.parse(body);
                        fn(req, res, segments, data);
                    });
                 }
            }
            return route.method;
        };
        return route.method;
    };

    rest.router = (function() {
        var routes = {};

        return {
            add : function(url) {
                var location = routes;
                var urlMatch = url.replace(/[\-[\]\{\}\(\)\*\+\?\.,\/\\\^\$\|#\s]/g, "\\$&").replace(/(:[^(\\/)]+)/g,"([^/]*)");
                var patternRE = new RegExp(urlMatch);
                var paramKeys = (url.indexOf("/:")) ? url.replace(/(\/[^:][^\/]+)/g, '').substr(2).split("/:") :[];
                location[urlMatch] = rest.handlers({});
                rest.matchDefs[urlMatch] = {re:patternRE, paramKeys:paramKeys};
                return location[urlMatch];
            },
            handle : function(req, res) {
                // Handle options

                var method = req.method.toLowerCase();

                var location = routes;
                var paramKeys;
                var params={};
                for (var pattern in rest.matchDefs) {
                    var urlParams = req.url.match(rest.matchDefs[pattern].re);
                    if ( urlParams != null){
                        // Align variables in the URL with the REST definition
                        var paramKeys = rest.matchDefs[pattern].paramKeys;
                        for(var ikey=0; ikey < paramKeys.length; ikey++)  {
                            params[paramKeys[ikey]] = urlParams[ikey + 1];
                        }
                        location = routes[pattern];
                        break;
                    }
                }

                if (!location.methods || !location.methods[method]) {
                    return rest.respond(res, 501, {'Content-type' : 'text/plain'}, 'Not Implemented');
                }

                location.methods[method](req, res, params);

            },

            respond : function(code, headers, data) {
               rest.respond(res,code, headers, data);
            }
        }
    })()

    rest.listen = function(host, port, cb) {
        http.createServer(rest.router.handle).listen(host, port, cb);
    };

    return rest;
};