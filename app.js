var NYT = require('nyt');
var mysql = require('mysql');
var util = require('util');
var guardian = require('guardian-news');
var AlchemyAPI = require('alchemy-api');
var alchemy = new AlchemyAPI('38be13e0eb95fc7806ff197fbb784d33558dbe3c');

var keys = {
    'most-popular': 'cb76354cff5a72e93e1e76afa2e4015f:15:72699233'
};

var nyt = new NYT(keys);
var inserted = 0;
var subjects = {};

var getGuardianArticles = function(data) {
  guardian.config({
    apiKey: '5c0868ca-c973-4d1d-8062-47ed79ef96ae'
  });
  var datetime = new Date();
  var month = datetime.getUTCMonth() + 1;
  var day = datetime.getUTCDate();
  var year = datetime.getUTCFullYear();
  currentDate = year + '-' + month + '-' + day
  guardian.content({fromDate : currentDate}).then(function(response){
    console.log(response.response.results);
    createDatabase(response, data);
  }, function(err){
    console.log(err);
  });
}

var createDatabase = function(gdata, ndata) {
    var parsedNData = JSON.parse(ndata);
    var conn = mysql.createConnection({
        host     : 'ajz2120stories.cz6woaizkeyb.us-west-2.rds.amazonaws.com',
        port     : '3306',
        user     : 'topstory',
        password : 'topstory',
        database : 'stories',
    });

    conn.connect();
    // Drop existing TopStories table
    conn.query('DROP TABLE IF EXISTS TopStories', function(err, result) {
        // Catch error in dropping table
        if(err) {
            console.log(err);
        }
        else {
            console.log("Table TopStories Dropped");
        }
    });
    // Create new TopStories table
    conn.query("CREATE TABLE TopStories ( \
              ID int, \
              URL VARCHAR(200), \
              Section VARCHAR(200), \
              Title VARCHAR(200), \
              Abstract VARCHAR(200), \
              Source VARCHAR(20), \
              FirstImage VARCHAR(200), \
              Keywords VARCHAR(200))", function(err, result) {
                  // Catch error in creating table
                  if(err) {
                    console.log(err);
                  }
                  else {
                    console.log("Table TopStories Created");
                    console.log(parsedNData)
                    pushToDatabase(parsedNData, gdata, conn);
                  }
                })
  };

var pushToDatabase = function(ndata, gdata, conn) {
    parseSubjects(ndata);
    // Write NYT stories to TopStories table
    for (var i = 0; i < ndata.results.length; i++)
    {
      var id = i+1;
      var storyURL = ndata.results[i].url;
      var section = ndata.results[i].section;
      var title = ndata.results[i].title;
      var abstract = ndata.results[i].abstract;
      var source = "NYT";
      var firstImage = null;
      if (ndata.results[i].media) {
        if (ndata.results[i].media !== null) {
          var done = false;
          for (var x=0; x < ndata.results[i].media.length; x++) {
            if (ndata.results[i].media[x].type == "image") {
              for (var y = 0; y < ndata.results[i].media[x]["media-metadata"].length; y++) {
                if (ndata.results[i].media[x]["media-metadata"][y].url) {
                  firstImage = ndata.results[i].media[x]["media-metadata"][y].url;
                  done = true;
                  break;
                }
            }
        }
      }
      var keywords = ndata.results[i].adx_keywords;
      article = {ID: id, URL: storyURL, Section: section, Title: title,
                Abstract: abstract, Source: source, FirstImage: firstImage,
                Keywords: keywords};
      conn.query('INSERT INTO TopStories SET ?', article, function (err, result) {
          // Catch error in inserting record
          if(err) {
            console.log(err);
          }
          else {
            inserted++;
            console.log(inserted,"Records Inserted");
          }
        });
    }
    var offset = ndata.results.length;
    for (var i = 0; i < gdata.response.results.length; i++) {
      var id = i+1+offset;
      var storyURL = gdata.response.results[i].webUrl;
      var section = gdata.response.results[i].sectionName;
      var title = gdata.response.results[i].webTitle;
      var source = "Guardian";
      article = {ID: id, URL: storyURL, Section: section, Title: title,
                Source: source};
      conn.query('INSERT INTO TopStories SET ?', article, function (err, result) {
          // Catch error in inserting record
          if(err) {
            console.log(err);
          }
          else {
            inserted++;
            console.log(inserted,"Records Inserted");
          }
        });
    }
};

var parseSubjects = function(jsonData) {
    var arrayLength = jsonData.results.length;
    for (var i = 0; i < arrayLength; i++) {
        var abstractText = jsonData.results[i].abstract;
        alchemy.concepts( abstractText, {}, function(err, response) {
            if (err) {
                throw err;
            }
            //console.log(response);
            var concepts = response.concepts;
            for (var i = 0; i < 3 && i < concepts.length; i++) {
                var subject = concepts[i].text;
                /*if (subjects.hasOwnProperty(subject) && subject !== '') {
                    subjects[subject]++;
                } else if (subject !== '') {
                    subjects[subject] = 1;
                }*/
                if (subjects[subject] === undefined && subject !== '') {
                    subjects[subject] = 1;
                } else if (subject !== '') {
                    subjects[subject]++;
                }
            }
        });
    }
}

nyt.mostPopular.viewed({'section': 'all-sections', 'time-period': '1'}, getGuardianArticles);
nyt.mostPopular.viewed({'section': 'all-sections', 'time-period': '1'}, createDatabase);
