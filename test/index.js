const fastify = require('fastify');
const assert = require('assert/strict');
const sanitizer = require('../src/sanitizer');

assert(sanitizer(1) === 1, 'Primitive type number is ignored.');
assert(sanitizer('') === '', 'Empty string is ignored.');
assert(sanitizer('test') === 'test', 'Normal string is ignored.');
assert(sanitizer('$lte') === undefined, 'String which starts with $ is sanitized.');
assert(sanitizer(true) === true, 'Boolean "true" stays true.');
assert(sanitizer(Infinity) === Infinity, 'Infinity stays Infinity.');
assert(sanitizer(false) === false, 'Boolean "false" stays false.');
assert(sanitizer(null) === null, 'null is ignored.');
assert(sanitizer(undefined) === undefined, 'undefined stays undefined.');
assert(JSON.stringify(sanitizer({})) === JSON.stringify({}), 'Empty object stays the same.');

const testObject1 = { a: 1, $gte: 2 };
const testObject1Sanitized = sanitizer(testObject1);
assert.deepStrictEqual(testObject1Sanitized, { a: 1 }, 'Failed to sanitize object 1.');

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

// Values that start with $ are also stripped
assert.deepStrictEqual(sanitizer({ url: '$HOME/path' }), {}, 'Object entry with $-prefixed value is stripped.');
assert.deepStrictEqual(sanitizer(['a', '$b', 'c']), ['a', 'c'], '$-prefixed array elements are stripped.');

const server = fastify();
server
  .register(require('../index'))
  .post('/:param1key/:param2key', async (req, res) => res.send({ params: req.params, querystring: req.query, body: req.body }))
  .ready(async (err) => {
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
    await server.close();
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

  // Test disabling sanitization per field
  const serverNoParams = fastify();
  await serverNoParams
    .register(require('../index'), { params: false, query: false, body: false })
    .post('/:key', async (req, res) => res.send({ params: req.params, querystring: req.query, body: req.body }))
    .ready();

  const resDisabled = await serverNoParams.inject({
    method: 'POST',
    url: '/$key?$q=1',
    payload: { $a: 1 },
  });
  assert(resDisabled.statusCode === 200, 'Disabled-sanitization server response code is not 200.');
  const disabledBody = resDisabled.json();
  assert.deepStrictEqual(disabledBody.params, { key: '$key' }, "Params should not be sanitized when disabled.");
  assert.deepStrictEqual(disabledBody.querystring, { $q: '1' }, "Query should not be sanitized when disabled.");
  assert.deepStrictEqual(disabledBody.body, { $a: 1 }, "Body should not be sanitized when disabled.");
  await serverNoParams.close();
}
