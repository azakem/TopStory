var NYT = require('nyt');
var mysql = require('mysql');

var keys = {
    'most-popular': 'cb76354cff5a72e93e1e76afa2e4015f:15:72699233'
};

var nyt = new NYT(keys);
var inserted = 0;

var createDatabase = function(data) {
    var parsedData = JSON.parse(data);
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
      })
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
                    console.log(parsedData)
                    pushToDatabase(parsedData, conn);
                  }
                })
  };

var pushToDatabase = function(data, conn) {
    // Write stories to TopStories table
    var i = 1;
    for (var x in data.results)
    {
      var id = i;
      var storyURL = data.results[x].url;
      var section = data.results[x].section;
      var title = data.results[x].title;
      var abstract = data.results[x].abstract;
      var source = "NYT";
      var firstImage = null;
      if (data.results[x].media) {
        if (data.results[x].media !== null) {
          var done = false;
          for (y in data.results[x].media) {
            if (data.results[x].media[y].type == "image") {
              for (z in data.results[x].media[y]["media-metadata"]) {
                if (data.results[x].media[y]["media-metadata"][z].url) {
                  firstImage = data.results[x].media[y]["media-metadata"][z].url;
                  done = true;
                  break;
                }
              }
            }
            if (done == true) {
              break;
            }
          }
        }
      }
      var keywords = data.results[x].adx_keywords;
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
        i++;
    }
  };

nyt.mostPopular.viewed({'section': 'all-sections', 'time-period': '1'}, createDatabase);
