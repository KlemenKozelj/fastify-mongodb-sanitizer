const fastifyPlugin = require('fastify-plugin');
const sanitize = require('./src/sanitizer');

module.exports = fastifyPlugin(async (fastify, { params = true, query = true, body = true }) => {
  fastify
    .addHook('preHandler', async (req) => {
      if (params) {
        req.params = sanitize(req.params);
      }
      if (query) {
        req.query = sanitize(req.query);
      }
      if (body) {
        req.body = sanitize(req.body);
      }
    });
}, {
  name: 'fastify-mongodb-sanitizer',
  fastify: "^4.x || ^5.x"
});
