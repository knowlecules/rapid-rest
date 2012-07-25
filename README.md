rapid-rest
==========

Minimal overhead NodeJS REST server. 

Insprired by the amazing throughput of NodeJS but dissappointed by the overhead of the available libraries I decided to hone my own.

See [rest-stress](https://github.com/knowlecules/rest-stress)

or [codeproject](http://www.codeproject.com/Articles/379614/NodeJS-REST-server-trials-to-validate-effective-sc) review 

## Installation and Usage

Install rapid-rest with npm 

    npm install rapid-rest 

The following call should be placed on your web facing server page.
```
    require('rapid-rest')
```


##Syntax
The syntax is wholesale copy of the node-rest project which seems to have lost some of it's steam plus some smatterings of other REST syntaxes that I've used along the way.  

#### Example 1:
Accept a GET request that has a single parameter in the path 
```
routes('/there/:over_name')
    ('get', function(req, res, params){
        function(){
           alert("You requested:" + params.over_name)
        }
    });
routes.listen(port);
```

#### Example 2:
Accept a POST request with multiple parameter in the path 
```
routes('/here/:here_name/:user')
    ('post', function(req, res, params, data){
       function(){
          alert("You sent:" + JSON.stringify(data) + " to " +  params.here_name  + " for user: " + params.user)
       }
    });
```

#### Example 3:
Accept a DELETE request with parameters defined in the path and with multiple required querystring parameters. 
```
routes('/there/:where?here_name={here_name}&user={user}')
     ('delete', function(req, res, params){
         function(){
            alert("You're deleting:" + params.where + " where here_name is " +  params.here_name  + ", for user: " + params.user)
         }
      });
```

##Future development
+ Allow integration with middleware such as connect or express
+ More tests

