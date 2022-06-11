# fastify-mongodb-sanitizer

![CI/CD](https://github.com/KlemenKozelj/fastify-mongodb-sanitizer/actions/workflows/main.yml/badge.svg) ![Vulnerabilities](https://snyk.io/test/github/KlemenKozelj/fastify-mongodb-sanitizer/badge.svg)

Slim, well tested and zero dependencies Fastify plugin which through middleware sanitizes all user server inputs to increase overall security by preventing potential MongoDB database query injection attacks.
To further tighten the security please consider disabling server-side execution of JavaScript code or be extra cautious when running `$where` and `MapReduce` commands, taken from [MongoDB FAQ](https://www.mongodb.com/docs/manual/faq/fundamentals/#javascript).


## Install
```
npm install --save fastify-mongodb-sanitizer
```

## Usage
Package `fastify-mongodb-sanitizer` will in `preHandler` middleware hook remove all client server inputs (request URL parameters, query strings and body) starting with "$".

```js
const fastify = require('fastify')();
const fastifyMongoDbSanitizer = require('fastify-mongodb-sanitizer');

const fastifyMongodbsanitizerOptions = {
    params: true,
    query: true,
    body: true,
};

fastify
    .register(fastifyMongoDbSanitizer, fastifyMongodbsanitizerOptions)
    .get('/', (req, res) => res.send({ hello: 'world' }))
    .listen({ port: 3000 });
```

#### Example
In following POST request
```js
server.inject({
    method: 'POST',
    url: `/$aaaa?$bbbb=10&cccc=$gte&dddd=3`,
    payload: {
        a: 1,
        $eq: 2,
        c: ['$lte', 'd', true],
        e: {
            f: 1,
            $ge: true
        }
    },
})
```
sanatizer will remove all keys and values starting with $, expected result in handler function will be:
```js
function requestHandler(req, res) {
    req.params // {}
    req.query  // { dddd: 3 }
    req.body   // { a: 1, c: ['d', true], e: { f: 1 } }
}
```
stay safe :)