const fastifyPlugin = require('fastify-plugin');
const sanatize = require('./src/sanitizer');

module.exports = fastifyPlugin(async (fastify, {params=true, query=true, body=true}) => {
  fastify
      .addHook('preHandler', async (req) => {
        if (params) {
          req.params = sanatize(req.params);
        }
        if (query) {
          req.query = sanatize(req.query);
        }
        if (body) {
          req.body = sanatize(req.body);
        }
      });
}, {
  name: 'fastify-mongodb-sanitizer',
  fastify: '5.x',
});
