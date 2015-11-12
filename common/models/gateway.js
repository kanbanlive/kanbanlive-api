var request = require('request');

module.exports = function(Gateway) {
  Gateway.observe('after save', function(ctx, next) {
    if (ctx.instance) {
      gateway = ctx.instance;

      // Gateway.app.io.emit( "gateway/updated", { body: gateway });

      var configuredAsGateway = process.env.KANBANLIVE_GATEWAY || false;

      if (configuredAsGateway) {
        request.put({
          url: 'https://kanbanlive-api.herokuapp.com:443/api/gateways/' + gateway.id,
          method: 'PUT',
          json: gateway
        }, function(err, response) {
          if (err) console.error(err);
        });
      }
    }

    next();
  });
};
