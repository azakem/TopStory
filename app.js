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
var insertedSubjects = 0;
var subjects = {};
var articleSubjects = {};
var alchemyArticles = null;

var main = function(callback) {
    nyt.mostPopular.viewed({'section': 'all-sections', 'time-period': '1'}, getGuardianArticles);
    var delay = setTimeout(function () {callback(null);}, 15000);
};

var getGuardianArticles = function(data) {
    console.log(JSON.parse(data).results);
    console.log('get guardian articles');
    guardian.config({
        apiKey: '5c0868ca-c973-4d1d-8062-47ed79ef96ae'
    });
    var datetime = new Date();
    var month = datetime.getUTCMonth() + 1;
    var day = datetime.getUTCDate();
    var year = datetime.getUTCFullYear();
    var currentDate = year + '-' + month + '-' + day;
    guardian.content({fromDate : currentDate}).then(function(response){
        console.log(response.response.results);
        createDatabase(null, response, data, parseNytSubjects);
        console.log('The darkest timeline');
    }, function(err){
        console.log(err);
    });
};

var createDatabase = function(err, gdata, ndata, callback) {
    console.log('create database');
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
    conn.query("CREATE TABLE TopStories (ID int, URL VARCHAR(200), Section VARCHAR(200), Title VARCHAR(200), Abstract VARCHAR(200), Source VARCHAR(20), FirstImage VARCHAR(200), Keywords VARCHAR(200), Subjects VARCHAR(200))", function(err, result) {
        // Catch error in creating table
        if(err) {
            console.log(err);
            return err;
        } else {
            console.log("Table TopStories Created");
            //console.log(parsedNData)
            callback(null, parsedNData, gdata, conn, parseGuardianSubjects);
        }
    });
};

var parseNytSubjects = function(err, jsonData, guardianData, conn, callback) {
    var arrayLength = jsonData.results.length;
    for (var i = 0; i < arrayLength; i++) {
        var url = jsonData.results[i].url;
        alchemy.concepts( url, {}, function(err, response) {
            if (err) {
                throw err;
            }
            console.log(response);
            var storyURL = response.url.slice(0,-5);
            var concepts = response.concepts;
            var topArticleSubjects = [];
            var numsubjects = concepts.length;
            var endpoint = Math.min(numsubjects, 3);
            for (var j = 0; j < endpoint; j++) {
                var subject = concepts[j].text;
                topArticleSubjects.push(subject);
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
                if (j === endpoint - 1) {
                    articleSubjects[storyURL] = topArticleSubjects;
                    console.log("Article URL:",storyURL);
                    console.log("Article subjects:",topArticleSubjects);
                    console.log("Array entry:",articleSubjects[storyURL]);
                }
            }
            //console.log(subjects);
        });
        if (i === arrayLength - 1) {
            console.log(subjects);
        }
    }
    var delay = setTimeout(function () {callback(null, jsonData, guardianData, conn, getAlchemyArticles);},5000);
};

var parseGuardianSubjects = function(err, nytData, jsonData, conn, callback) {
    var data = jsonData.response.results;
    var arrayLength = data.length;
    for (var i = 0; i < arrayLength; i++) {
        var url = data[i].webUrl;
        alchemy.concepts(url, {}, function(err, response) {
            if (err) {
                throw err;
            }
            console.log(response);
            var storyURL = response.url;
            var concepts = response.concepts;
            var topArticleSubjects = [];
            var numsubjects = concepts.length;
            var endpoint = Math.min(numsubjects, 3);
            for (var j = 0; j < endpoint; j++) {
                var subject = concepts[j].text;
                topArticleSubjects.push(subject);
                if (subjects[subject] === undefined && subject !== '') {
                    subjects[subject] = 1;
                } else if (subject !== '') {
                    subjects[subject]++;
                }
                if (j === endpoint-1) {
                    articleSubjects[storyURL] = topArticleSubjects;
                    console.log("Article URL:",storyURL);
                    console.log("Article subjects:",topArticleSubjects);
                    console.log("Array entry:",articleSubjects[storyURL]);
                }
            }
            //console.log(subjects);
        }); //end of delay statement

        if (i === arrayLength - 1) {
            console.log(subjects);
        }
    }
    //callback(null, nytData, jsonData, conn, pushToDatabase);
    var delay = setTimeout(function () { callback(null, nytData, jsonData, conn, parseAlchemySubjects); }, 10000);
};

var getAlchemyArticles = function(err, nytData, guardianData, conn, callback) {
    var request = require('request');
    request('https://gateway-a.watsonplatform.net/calls/data/GetNews?apikey=38be13e0eb95fc7806ff197fbb784d33558dbe3c&outputMode=json&start=now-1d&end=now&count=1000&return=enriched.url.url,enriched.url.title,enriched.url.concepts.concept.text,enriched.url.concepts.concept.relevance',
            function(error, response, body) {
                if (error) {
                    console.log(error);
                } else if (response.statusCode == 200) {
                    var info = JSON.parse(body);
                    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Alchemy Results~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
                    console.log(info);
                    for (var i = 0; i < info.result.docs.length; i++) {
                        console.log(info.result.docs[i].source.enriched.url.title);
                        console.log(info.result.docs[i].source.enriched.url.url);
                        console.log(info.result.docs[i].source.enriched.url.concepts);
                    }
                    alchemyArticles = info;
                    callback(err, nytData, guardianData, conn, pushToDatabase);
                } else {
                    console.log('no response');
                }
            }
    );
};

var parseAlchemySubjects = function(err, nytData, guardianData, conn, callback) {
    for (var i = 0; i < alchemyArticles.result.docs.length; i++) {
        var url = alchemyArticles.result.docs[i].source.enriched.url.url;
        var topArticleSubjects = [];
        var numsubjects = alchemyArticles.result.docs[i].source.enriched.url.concepts.length;
        var endpoint = Math.min(numsubjects, 3);
        for (var j = 0; j < endpoint; j++) {
            var subject = alchemyArticles.result.docs[i].source.enriched.url.concepts[j].text;
            topArticleSubjects[j] = subject;
                if (subjects[subject] === undefined && subject !== '') {
                    subjects[subject] = 1;
                } else if (subject !== '') {
                    subjects[subject]++;
                }
                if (j === endpoint-1) {
                    articleSubjects[url] = topArticleSubjects;
                }
            }
            //console.log(subjects);
        }
    var delay = setTimeout(function () { callback(err, nytData, guardianData, alchemyArticles, conn, sortSubjects); },10000);
};

var pushToDatabase = function(err, ndata, gdata, alchemyArticles, conn, callback) {
    console.log('push to database');
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
            }
        }
        var keywords = ndata.results[i].adx_keywords;
        var subjects = "";
        var subjectList = articleSubjects[storyURL];
        console.log("Subject List:",subjectList);
        console.log("URL:",storyURL);
        if (subjectList && subjectList.length > 0) {
            for (var j = 0; j < subjectList.length; j++) {
                subjects = subjects + subjectList[j] + ";";
            }
        }

        article = {ID: id, URL: storyURL, Section: section, Title: title,
            Abstract: abstract, Source: source, FirstImage: firstImage,
            Keywords: keywords, Subjects: subjects};

        conn.query('INSERT INTO TopStories SET ?', article, function (err, result) {
            // Catch error in inserting record
            if(err) {
                console.log(err);
            }
            else {
                inserted++;
                console.log(inserted,"Records Inserted - NYT");
            }
        });
    }

    //write Guardian stories to TopStories table
    var offset = ndata.results.length;
    for (var i = 0; i < gdata.response.results.length; i++) {
        var id = i+1+offset;
        var storyURL = gdata.response.results[i].webUrl;
        var section = gdata.response.results[i].sectionName;
        var title = gdata.response.results[i].webTitle;
        var source = "Guardian";
        var subjects = "";
        var subjectList = articleSubjects[storyURL];
        if (subjectList && subjectList.length > 0) {
            for (var j = 0; j < subjectList.length; j++) {
                subjects = subjects + subjectList[j] + ";";
            }
        }

        article = {ID: id, URL: storyURL, Section: section, Title: title,
            Source: source, Subjects: subjects};
        conn.query('INSERT INTO TopStories SET ?', article, function (err, result) {
            // Catch error in inserting record
            if(err) {
                console.log(err);
            } else {
                inserted++;
                console.log(inserted,"Records Inserted - Guardian");
            }
        });
    }

    //write AlchemyNews stories to TopStories table
    offset = offset + gdata.response.results.length;
    for (var i = 0; i < alchemyArticles.result.docs.length; i++) {
        var id = i+1+offset;
        var storyURL = alchemyArticles.result.docs[i].source.enriched.url.url;
        var title = alchemyArticles.result.docs[i].source.enriched.url.title;
        var source = "AlchemyNews";

        var subjects = "";
        var subjectList = articleSubjects[storyURL];
        if (subjectList && subjectList.length > 0) {
            for (var j = 0; j < subjectList.length; j++) {
                subjects = subjects + subjectList[j] + ";";
            }
        }

        article = {ID: id, URL: storyURL, Title: title,
            Source: source, Subjects: subjects};
        conn.query('INSERT INTO TopStories SET ?', article, function (err, result) {
            // Catch error in inserting record
            if(err) {
                console.log(err);
            } else {
                inserted++;
                console.log(inserted,"Records Inserted - AlchemyNews");
                if (i === alchemyArticles.result.docs.length - 1 || inserted === 40) {
                    callback(conn);
                }
            }
        });
    }
};

var sortSubjects = function(conn) {
    console.log(subjects);
    console.log("sortSubjects");
    var keysSorted = Object.keys(subjects).sort(function(a,b) {return subjects[a]-subjects[b]});
    console.log(keysSorted);

    conn.query('DROP TABLE IF EXISTS TopSubjects', function(err, result) {
        // Catch error in dropping table
        if(err) {
            console.log(err);
        }
        else {
            console.log("Table TopSubjects Dropped");
        }
    });

    // Create new TopStories table
    conn.query("CREATE TABLE TopSubjects (ID int, Subject VARCHAR(200))", function(err, result) {
        // Catch error in creating table
        if(err) {
            console.log(err);
            return err;
        } else {
            console.log("Table TopSubjects Created");
        }
    });

    for (var i = 0; i <5; i++) {
        var index = keysSorted.length - 1 - i;
        subject = {ID: i+1, Subject: keysSorted[index]};
        conn.query('INSERT INTO TopSubjects SET ?', subject, function (err, result) {
            // Catch error in inserting record
            if(err) {
                console.log(err);
            }
            else {
                insertedSubjects++;
                console.log("Inserted",insertedSubjects,"Subjects");
            }
        });
    }
};

main(function(err) {
    console.log("Final callback");
});
