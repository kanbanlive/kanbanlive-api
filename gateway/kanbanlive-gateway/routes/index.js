var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Dashboard' });
});

/* GET inventory page. */
router.get('/inventory', function(req, res, next) {
  res.render('inventory', { title: 'Inventory' });
});

/* GET inventory page. */
router.get('/panel', function(req, res, next) {
  res.render('panel', { title: 'Panel' });
});

/* GET inventory page. */
router.get('/panel-list', function(req, res, next) {
  res.render('panel-list', { title: 'Panel' });
});



module.exports = router;
