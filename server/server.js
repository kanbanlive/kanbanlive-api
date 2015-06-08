var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

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

    var gateway = process.env.KANBANLIVE_GATEWAY || false;

    if (gateway) {
      var p = "/dev/tty.usbserial-A501B666";
      // var p = "/dev/ttyAMA0";
      console.log('Opening serial port: ' + p);

      var serialPort = require('serialport');
      var SerialPort = serialPort.SerialPort;

      var sp = new SerialPort(p, {
         baudrate: 9600,
         parser: serialPort.parsers.readline("--")
      });

      var ts = new Date();
      var lastTime =ts.getTime();
      var message = "";
      var lastMessage = message;
      sp.on('data', function(data) {
        ts = new Date();
        message = data.toString();

        if (message == 'a' || message == 'AWAKE' || message == '') {
          return;
        }

        var currentTime = ts.getTime();
        var diff = Math.abs(currentTime - lastTime);
        if ((diff < 500) && (message == lastMessage)) {
          return;
        }

        lastTime = currentTime;
        lastMessage = message;
        console.log("Rx: %s", message);

        val = parseInt(message.substring(message.length - 4), 16);

        app.models.Bin.find(function(err, bins) {
          var i;
          for (i in bins) {
            bin = bins[i];

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
      });
    }
  }
});
