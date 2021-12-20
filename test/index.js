const fastify = require('fastify');
const assert = require('assert');
const sanitizer = require('../src/sanitizer');


assert(sanitizer(1) === 1, 'Primitive type number is ignored.');
assert(sanitizer('') === '', 'Empty string is ignored.');
assert(sanitizer('test') === 'test', 'Normal string is ignored.');
assert(sanitizer('$lte') === undefined, 'String which starts with $ is ignored.');
assert(sanitizer(true) === true, 'Boolean "true" stays true.');
assert(sanitizer(Infinity) === Infinity, 'Boolean "Infinity" stays Infinity.');
assert(sanitizer(false) === false, 'Boolean "false" stays false.');
assert(sanitizer(null) === null, 'Object "null" is ignored.');
assert(sanitizer(undefined) === undefined, 'undefined stays undefined.');
assert(JSON.stringify(sanitizer({})) === JSON.stringify({}), 'Empty object stays the same.');

const testObject1 = {a: 1, $gte: 2};
const testObject1Sanitized = sanitizer(testObject1);
assert(testObject1Sanitized !== testObject1, 'Returned object is new object.');
assert(testObject1.a === 1 && testObject1.$gte === 2, 'Original object is not modified.');

const testObject2 = {
  a: 1,
  $set: 2,
  b: {
    $eq: '3',
    c: true,
    d: {
      $lte: 4,
      e: [5, true, {f: [{$gte: 6, g: 7, h: {i: 1, $unset: [1, 2]}}]}],
    },
  },
};
const testObject2Sanitized = sanitizer(testObject2);
assert(testObject2Sanitized.a === 1, 'Root.a stays 1.');
assert(testObject2Sanitized.$set === undefined, 'Root.$set is removed.');
assert(testObject2Sanitized.b.$eq === undefined, 'Root.b.$eq is removed.');
assert(testObject2Sanitized.b.c === true, 'Root.b.c stays true.');
assert(testObject2Sanitized.b.d.$lte === undefined, 'Root.b.d.$lte is removed.');
assert(testObject2Sanitized.b.d.e[0] === 5, 'Root.b.d.e[0] is 5.');
assert(testObject2Sanitized.b.d.e[1] === true, 'Root.d.e[1] is true.');
assert(testObject2Sanitized.b.d.e[2].f[0].$gte === undefined, 'Root.b.d.e[2].f[0].$gte is removed.');
assert(testObject2Sanitized.b.d.e[2].f[0].g === 7, 'Root.b.d.e[2].f[0].g is 7.');
assert(testObject2Sanitized.b.d.e[2].f[0].h.i === 1, 'Root.b.d.e[2].f[0].h.i is 1.');
assert(testObject2Sanitized.b.d.e[2].f[0].h.$unset === undefined, 'Root.b.d.e[2].f[0].h.$unset is removed.');

fastify()
    .register(require('../index'))
    .post('/:paramID', async (req, res) => res.send({params: req.params, querystring: req.query, body: req.body}))
    .ready(async (err, server) => {
      assert(err === undefined, 'Server initialized correctly.');

      async function testServerCall(param, querystring, payload) {
        const res = await server.inject({
          method: 'POST',
          url: `/${param ?? 'param'}${querystring ?? ''}`,
          payload,
        });
        assert(res.statusCode === 200, 'Response is expected to be 200.');
        return res.json();
      }

      await testServer(testServerCall);
    });


async function testServer(testServerCall) {
  const {params, querystring, body} = await testServerCall(
      '$unset',
      '?test=a&$test=b&array=c&array=$d',
      {$a: 1, b: 2, c: [{d: 3}, {$e: 4}], f: {$k: 5}},
  );

  assert(params.$unset === undefined, 'params.$unset is undefined');

  assert(querystring.test === 'a', 'querystring.test is "a"');
  assert(querystring.$test === undefined, 'querystring.$test is undefined');
  assert(querystring.array.length === 1, 'querystring.$array.length is 2');
  assert(querystring.array[0] === 'c', 'querystring.array[0] is "c"');

  assert(body.$a === undefined, 'body.$a is undefined');
  assert(body.b === 2, 'body.b is 2');
  assert(body.c.length === 2, 'body.c.length is 2');
  assert(body.c[0].d === 3, 'body.c[0].d is 3');
  assert(body.c[1].$e === undefined, 'body.c[1].$e is undefined');
  assert(body.f.$k === undefined, 'body.f.$k is undefined');
}
