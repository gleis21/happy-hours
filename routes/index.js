var express = require('express');
var router = express.Router();
var creds = require('../config/happy-hours-9fc0a1813103.json');
var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var doc = new GoogleSpreadsheet('1UgUUn3kziCTMvSV5-pORg2tWb4baEec6otytUN-GtB8');
var sheet;

/* GET home page. */
router.get('/', function(req, res, next) {
  async.series([
    function setAuth(step) {
      doc.useServiceAccountAuth(creds, step);
    },
    function getInfoAndWorksheets(step) {
      doc.getInfo(function(err, info) {
        console.log('Loaded doc: '+info.title+' by '+info.author.email);
        sheet = info.worksheets[0];
        console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
        res.send('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
        step();
      });
    }
  ]);
  // res.render('index', { title: 'Express' });
});

module.exports = router;
