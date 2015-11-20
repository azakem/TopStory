//Setup web server and socket
var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    mysql = require('mysql'),
    nyt = require('nyt');

    
