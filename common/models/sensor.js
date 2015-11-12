var request = require('request');

module.exports = function(Sensor) {
  Sensor.observe('after save', function(ctx, next) {
    if (ctx.instance) {
      sensor = ctx.instance;

      Sensor.app.io.emit( "sensor/updated", { body: sensor });

      var configuredAsGateway = process.env.KANBANLIVE_GATEWAY || false;

      if (configuredAsGateway) {
        request.put({
          url: 'https://kanbanlive-api.herokuapp.com:443/api/sensors/' + sensor.id,
          method: 'PUT',
          json: sensor
        }, function(err, response) {
          if (err) console.error(err);
        });
      }
    }

    next();
  });
};
