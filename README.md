rapid-rest
==========

Minimal NodeJS REST server

See [rest-stress](https://github.com/knowlecules/rest-stress)

or [codeproject](http://www.codeproject.com/Articles/379614/NodeJS-REST-server-trials-to-validate-effective-sc) review 

***Not fully tested***

However, it should now work with the following URL formats

 1. /here/:here_name/:user
 + /here?here_name={here_name}&user={user}
 + /there/:where?here_name={here_name}&user={user}

The first format works for sure. See [rest-stress](https://github.com/knowlecules/rest-stress)

Formats 2 and 3 are parsed and stored correctly in the routes, so I'm pretty sure they sure they will work.

###How's the performance?
It cost's to parse and check, but the numbers are still pretty good. All the new features incur a 4% slowdown.