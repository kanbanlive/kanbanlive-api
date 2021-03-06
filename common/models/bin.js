var request = require('request');

module.exports = function(Bin) {
  Bin.observe('after save', function(ctx, next) {
    if (ctx.instance) {
      bin = ctx.instance;

      Bin.app.io.emit( "bin/updated", { body: bin });

      var configuredAsGateway = process.env.KANBANLIVE_GATEWAY || false;

      if (configuredAsGateway) {
        request.put({
          url: 'https://kanbanlive-api.herokuapp.com:443/api/bins/' + bin.id,
          method: 'PUT',
          json: bin
        }, function(err, response) {
          if (err) console.error(err);
        });
      }
    }

    next();
  });
};
