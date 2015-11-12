var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();
app.use(loopback.logger('dev'));

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    console.log('Web server listening at: %s', app.get('url'));
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module) {
    app.io = require('socket.io')(app.start());
    app.io.on('connection', function(socket){
      console.log('connected');
      socket.on('disconnect', function(){
          console.log('disconnected');
      });
    });

    setInterval(function() {
      app.models.Sensor.findById(1, function(err, sensor) {
        if (sensor.status == "Not connected") {
          return;
        }

        var sensorDisconnected = false;
        if (sensor.lastHeartbeatAt == null) {
          sensorDisconnected = true;
        }
        else {
          var now = new Date();
          var diff = now  - sensor.lastHeartbeatAt;

          // set disconnected if we haven't received
          // a heartbeat for over 90 seconds
          if (diff > 90000) {
            sensorDisconnected = true;
          }
        }

        if (sensorDisconnected) {
          console.log("[%s] Sensor disconnected", now.toISOString());
          sensor.status = "Not connected";
          sensor.save();
        }
      });
    }, 10000);

    var gateway = process.env.KANBANLIVE_GATEWAY || false;

    if (gateway) {
      console.log('Configured as gateway');

      // var p = "/dev/tty.usbserial-A501B666";
      var p = "/dev/tty.usbmodem000001";
      // var p = "/dev/ttyAMA0";
      console.log("Opening serial port: %s", p);

      var serialPort = require('serialport');
      var SerialPort = serialPort.SerialPort;

      var sp = new SerialPort(p, {
         baudrate: 9600,
         parser: serialPort.parsers.readline("-")
      });

      var ts = new Date();
      var lastTime = ts.getTime();
      var message = "";
      var lastMessage = message;
      sp.on('data', function(data) {
        ts = new Date();
        message = data.toString();

        if (message.length != 11) {
          console.log("%s ignoring message: %s", ts.toISOString(), message);
          return;
        }

        var currentTime = ts.getTime();
        var diff = Math.abs(currentTime - lastTime);
        if ((diff < 500) && (message == lastMessage)) {
          return;
        }

        lastTime = currentTime;
        lastMessage = message;
        console.log("[%s] rx: %s", ts.toISOString(), message);

        batteryLevel = parseInt(message.substring(3, 7), 16) / 1000;
        val = parseInt(message.substring(message.length - 4), 16);
        console.log("[%s] batttery level: %dV, value: %s", ts.toISOString(), batteryLevel, val);

        app.models.Sensor.findById(1, function(err, sensor) {
          sensor.status = "Connected";
          sensor.batteryLevel = batteryLevel;
          sensor.lastHeartbeatAt = new Date();
          sensor.save();
        });

        if ((val == 0x001A) || (val == 0x001B)) {
          key = message.substring(1);
          app.models.Bin.find({where: {key: key}, limit: 1}, function(err, bins) {
            var i;
            for (i in bins) {
              bin = bins[i];

              if (bin.status == 'has-stock') {
                bin.status = 'requires-stock';
              }
              else if (bin.status == 'requires-stock') {
                bin.status = 'empty';
              }
              else if (bin.status == 'empty') {
                bin.status = 'has-stock';
              }
              else {
                bin.status = 'has-stock';
              }

              bin.updated_at = currentTime;
              bin.save();
            }
          });
        }
        else {
          app.models.Bin.find(function(err, bins) {
            var i;
            for (i in bins) {
              bin = bins[i];

              if ((bin.key == 'AA000001A') || (bin.key == 'AA000001B')) {
                continue;
              }

              var status = val & bin.port_mask;

              if (status == 0) {
                new_status = 'has-stock';
              }
              else {
                new_status = 'requires-stock';
              }
              // else if (status == 2) {
              //   bin.status = 'empty';
              // }
              // else {
              //   bin.status = 'has-stock';
              // }

              if (bin.status != new_status) {
                bin.status = new_status;
                bin.updated_at = currentTime;
                bin.save();
              }
            }
          });
        }
      });
    }
    else {
      console.log('Configured as server');
    }
  }
});
