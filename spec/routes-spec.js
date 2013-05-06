var routes = require("../lib/rapid-rest")();

describe('rapid-rest-routes', function () {

    it('path with url params', function () {
        routes('/here/:here_name/:user')
            ('post', function (req, res, params, jsonData) {
                here(req, res, params, jsonData);
            });
        var rePattern = "\\/here\\/([^/]*)\\/([^/]*)";

        var matchDef = routes.matchDefs[rePattern];
        expect(matchDef).not.toEqual(null);

        expect(matchDef.re).toEqual(/\/here\/([^/]*)\/([^/]*)/);
        expect(matchDef.paramKeys[0]).toEqual("here_name");
        expect(matchDef.paramKeys[1]).toEqual("user");
    });

    it('enforced querystring kvps', function(){
        routes('/here?here_name={here_name}&user={user}')
            ('get', function(req, res, params, jsonData){
                here(req, res, params, jsonData);
            });
        var rePattern = "\\/here";

        var matchDef = routes.matchDefs[rePattern] ;
        expect(matchDef).not.toEqual(null);

        expect(matchDef.re).toEqual(/\/here\/([^/]*)\/([^/]*)/);
        expect(matchDef.queryKeys["here_name"]).not.toEqual("here_name");
        expect(matchDef.queryKeys["user"]).not.toEqual("user");
    });

    it('enforced querystring kvps with url params', function(){
        routes('/there/:where?here_name={here_name}&user={user}')
            ('get', function(req, res, params, jsonData){
                here(req, res, params, jsonData);
            });
        var rePattern = "\\/there\\/([^/]*)";

        var matchDef = routes.matchDefs[rePattern] ;
        expect(matchDef).not.toEqual(null);

        expect(matchDef.re).toEqual(/\/there\/([^/]*)/);
        expect(matchDef.paramKeys[0]).toEqual("where");
        expect(matchDef.queryKeys["here_name"]).toBeDefined();
        expect(matchDef.queryKeys["user"]).toBeDefined();
    });

});