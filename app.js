//Setup web server and socket
var NYT = require('nyt');

var keys = {
    'most-popular': 'cb76354cff5a72e93e1e76afa2e4015f:15:72699233'
}

var nyt = new NYT(keys);

nyt.mostPopular.viewed({'section': 'all-sections', 'time-period': '1'}, console.log);
