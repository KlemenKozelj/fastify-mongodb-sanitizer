const fastify = require('fastify');
const assert = require('assert/strict');
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

const testObject1 = { a: 1, $gte: 2 };
const testObject1Sanitized = sanitizer(testObject1);
assert.deepStrictEqual(testObject1Sanitized,  { a: 1 }, 'Failed to sanitize object 1.');

const testObject2Sanitized = sanitizer({
  a: 1,
  $set: 2,
  b: {
    $eq: '3',
    c: true,
    d: {
      $lte: 4,
      e: [5, true, { f: [{ $gte: 6, g: 7, h: { i: 1, $unset: [1, 2] } }] }],
    },
  },
});
assert.deepStrictEqual(
  testObject2Sanitized,
  {
    a: 1,
    b: {
      c: true,
      d: {
        e: [5, true, { f: [{ g: 7, h: { i: 1 } }] }],
      },
    },
  },
  'Failed to sanitize object 2.'
);

fastify()
  .register(require('../index'))
  .post('/:param1key/:param2key', async (req, res) => res.send({ params: req.params, querystring: req.query, body: req.body }))
  .ready(async (err, server) => {
    assert(!err, "Server did not initialize correctly.");

    async function testServerCall(param1val, param2val, querystring, payload) {
      const res = await server.inject({
        method: 'POST',
        url: `/${param1val}/${param2val}${querystring ?? ''}`,
        payload,
      });
      assert(res.statusCode === 200, 'Server response code is not 200.');
      return res.json();
    }

    await testServer(testServerCall);
  });


async function testServer(testServerCall) {
  const { params, querystring, body } = await testServerCall(
    '$param1val', 'param2val',
    '?test=a&$test=b&array=c&array=$d',
    { $a: 1, b: 2, c: [{ d: 3 }, { $e: 4 }], f: { $k: 5 } },
  );

  assert.deepStrictEqual(params, { param2key: 'param2val' }, "Params sanitization failed.");
  assert.deepStrictEqual(querystring, { test: 'a', array: ['c'] }, "Query string sanitization failed.");
  assert.deepStrictEqual(body, { b: 2, c: [{ d: 3 }, {}], f: {} }, "Body sanitization failed.");
}
