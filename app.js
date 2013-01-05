
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , matchEngine = require('./MatchEngine.js');

var engineRegistry = (function() {
  var registry = {};
  return {
    getEngine: function(contract) {
      var engine = registry[contract];
      if (!engine) {
        registry[contract] = engine = matchEngine.createEngine();
      }
      return engine;
    }
  };
})();

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get(/^\/match\/(\w+)$/, function(req, res) {
  var contract = req.params[0];
  var engine = engineRegistry.getEngine(contract);
  var renderMarketData = function(level) {
    if (!level)
      return '';
    return level.quantity + '\t\t @ \t\t' + new Number(level.price).toFixed(2);
  };
  console.log(req.session);
  res.render('match', { title: contract + ' match engine', contract: contract, engine: engine, render: renderMarketData, orders: req.session.orders || []});
});

app.get(/^\/cancel\/(\w+)\/(\d+)$/, function(req, res) {
  var contract = req.params[0];
  var id = req.params[1];
  var engine = engineRegistry.getEngine(contract);
  engine.cancelOrder(id);
  res.redirect('/match/'+contract);
});

app.post(/^\/match\/(\w+)$/, function(req, res) {
  var contract = req.params[0];
  var engine = engineRegistry.getEngine(contract);
  if (!req.session.orders)
    req.session.orders = [];
  var id = engine.submitOrder(req.body);
  req.session.orders.push({id: id, quantity: req.body.quantity, price: req.body.price});
  res.redirect('/match/'+contract);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
