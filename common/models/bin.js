module.exports = function(Bin) {
  Bin.observe('after save', function(ctx, next) {
    if (ctx.instance) {
      Bin.app.io.emit( "bin/updated", { body: ctx.instance });
    }
    next();
  });
};
