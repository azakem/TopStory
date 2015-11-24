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

var pushToDatabase = function(data) {
    parseSubjects(data);
};

var parseSubjects = function(jsonData) {
    var parsedData = JSON.parse(jsonData);
    var subjects = {};
    var arrayLength = parsedData.results.length;
    for (var i = 0; i < arrayLength; i++) {
        var keywords = parsedData.results[i].adx_keywords;
        var split = keywords.split(";");
        for (var j = 0; j < split.length; j++) {
            var subject = split[j].trim();
            if (subjects.hasOwnProperty(subject) && subject !== '') {
                subjects[subject]++;
            } else if (subject !== '') {
                subjects[subject] = 1;
            }
        }
    }
    console.log(subjects);
}

nyt.mostPopular.viewed({'section': 'all-sections', 'time-period': '1'}, pushToDatabase);
