//Setup web server and socket
var NYT = require('nyt');
var mysql = require('mysql');

var keys = {
    'most-popular': 'cb76354cff5a72e93e1e76afa2e4015f:15:72699233'
}

var nyt = new NYT(keys);

var conn = mysql.createConnection({
  host     : 'ajz2120stories.cz6woaizkeyb.us-west-2.rds.amazonaws.com:3306',
  port     : '3306',
  user     : 'topstory',
  password : 'topstory',
  database : 'stories',
});

conn.connect();

var pushToDatabase = function(data) {
    var parsedData = JSON.parse(data);
    console.log(parsedData);
};

nyt.mostPopular.viewed({'section': 'all-sections', 'time-period': '1'}, pushToDatabase);
