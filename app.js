'use strict';
let express = require('express'), http = require('http'), path = require('path'), fs = require('fs');

let app = express();

let logger = require('morgan');
let errorHandler = require('errorhandler');
let bodyParser = require('body-parser');
let req = require('then-request');
let basic = require('basic-authorization-header');

let devoxxUuidEndpoint;
let devoxxPrivateEndpoint;
let devoxxSpeakersEndpoint;
let devoxxRoomsEndpoint;
let devoxxScheduleEndpoint;
let devoxxTalkEndpoint;
let authHeader;

const winston = require('winston');
winston.level = 'debug';

winston.log('info', 'Launching app');

/**
 * Setup for all environment variables
 */
app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

let allowedOrigins = ['https://mydevoxx-dashboard.eu-gb.mybluemix.net'];

//Sets Env Variables based on environment
if ('development' === app.get('env')) {
    winston.log('info', 'Launching in development mode');
    app.use(errorHandler());

    // Update allowed origins
    allowedOrigins.concat(['https://localhost:3000', 'http://localhost:3000', ]);

    //Set up Wiremock Basic Auth
    authHeader = {
        'Authorization': basic('test@test.com', 'test')
    };

    //Wiremock URL for UUID
    devoxxUuidEndpoint = 'https://aston-wiremock.eu-gb.mybluemix.net/uuid';

    //Wiremock URL for Scheduled and Favored Talks
    devoxxPrivateEndpoint = 'https://aston-wiremock.eu-gb.mybluemix.net/';

    //wiremock endpoints
    devoxxSpeakersEndpoint = "https://aston-wiremock.eu-gb.mybluemix.net/api/conferences/DV17/speakers";
    devoxxRoomsEndpoint = "https://aston-wiremock.eu-gb.mybluemix.net/api/conferences/DV17/rooms";
    devoxxScheduleEndpoint = "https://aston-wiremock.eu-gb.mybluemix.net/api/conferences/DV17/schedules";
    devoxxTalkEndpoint = "https://aston-wiremock.eu-gb.mybluemix.net/api/conferences/DV17/talk";
} else {
    winston.log('info', 'Launching in production mode');
    //Set up BasicAuth Header
    authHeader = {
        'Authorization': basic(process.env.username, process.env.password)
    };
    winston.log('debug', '[EMAIL] ' + process.env.username);
    //Devoxx API URLS to retrieve a users UUID
    devoxxUuidEndpoint = 'http://cfp.devoxx.co.uk/uuid';

    //Retrieving the favourites and scheduled talks for the retrieved UUID
    devoxxPrivateEndpoint = 'http://cfp.devoxx.co.uk/api/proposals';

    //Public API URLS
    devoxxSpeakersEndpoint = "http://cfp.devoxx.co.uk/api/conferences/DV17/speakers/";
    devoxxRoomsEndpoint = "http://cfp.devoxx.co.uk/api/conferences/DV17/rooms/";
    devoxxScheduleEndpoint = "http://cfp.devoxx.co.uk/api/conferences/DV17/schedules/";
    devoxxTalkEndpoint = "http://cfp.devoxx.co.uk/api/conferences/DV17/talk/";
}

app.use((req, res, next) => {
    // Localhost is only fine in dev mode.
    let origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    return next();
});

/**
 * GET - uuid for user
 * Receives user email from devoxx dashboard ->
 * Returns UUID to devoxx dashboard to get user specific data
 */
app.get('/uuid', (request, response) => {
    let userEmail = request.query.email;
    let url = devoxxUuidEndpoint +'?email=' + userEmail;
    winston.log('debug', '[HTTP] Calling Devoxx with URL: ' + url);
    req('GET', url, {headers: authHeader}).then((res) => {
        winston.log('debug', '[HTTP] Response from devoxx with status: ' + res.statusCode);
        response.setHeader('Content-Type', 'text/plain');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        winston.log('debug', '[HTTP] Response from devoxx with error: ' + err.toString());
        response.setHeader('Content-Type', 'text/plain');
        response.status = 404;
        response.write("UUID not returned for email address given");
        response.end();
    })
});

/**
 * GET - scheduled talks for user
 * Returns the scheduled talks for the recieved uuid
 */
app.get('/scheduled', (request, response) => {
    let uuid = request.query.uuid;
    let url = devoxxPrivateEndpoint + '/' + uuid + '/scheduled';
    winston.log('debug', '[HTTP] Calling Devoxx with URL: ' + url);

    req('GET', url, {headers: authHeader}).then((res) => {
        winston.log('debug', '[HTTP] Response from devoxx with status: ' + res.statusCode);
        response.setHeader('Content-Type', 'application/json');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        winston.log('debug', '[HTTP] Response from devoxx with error: ' + err.toString());
        response.setHeader('Content-Type', 'application/json');
        response.status = 404;
        response.write("Scheduled talks not returned for email address given");
        response.end();
    })
});

/**
 * GET - favored talks for user
 * Returns the favored talks for the recieved uuid
 */
app.get('/favored', (request, response) => {
    let uuid = request.query.uuid;
    let url = devoxxPrivateEndpoint + '/' + uuid + '/favored';
    winston.log('debug', '[HTTP] Calling Devoxx with URL: ' + url);

    req('GET', url, {headers: authHeader}).then((res) => {
        winston.log('debug', '[HTTP] Response from devoxx with status: ' + res.statusCode);
        response.setHeader('Content-Type', 'application/json');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        winston.log('debug', '[HTTP] Response from devoxx with error: ' + err.toString());
        response.setHeader('Content-Type', 'application/json');
        response.status = 404;
        response.write("Favored Talks not returned for email address given");
        response.end();
    })
});

//Public API Calls

/**
 * GET - schedule for the Devoxx Conf
 * Returnns the days the conference is scheduled over
 * */
app.get('/api/conferences/DV17/schedules/', (request, response) => {

    let url = devoxxScheduleEndpoint;

    req('GET', url).then((res) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = 404;
        response.write("Schedule Not available");
        response.end();
    })
});

/**
 * GET - Rooms available at Devoxx Conf
 * Returns an Array of rooms
 * */
app.get('/api/conferences/DV17/rooms', (request, response) => {

    let url = devoxxRoomsEndpoint
    console.log(url);

    req('GET', url).then((res) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = 404;
        response.write("Schedule Not available");
        response.end();
    })
});

/**
 * GET - Speakers for the Devoxx Conf
 * Returnns the speakers scheduled at the conference
 * */
app.get('/api/conferences/DV17/speakers', (request, response) => {

    let url = devoxxSpeakersEndpoint;

    req('GET', url).then((res) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = 404;
        response.write("Schedule Not available");
        response.end();
    })
});

/**
 * GET - speaker
 * Returns the speaker
 * @Params speakerId
 */
app.get('/api/conferences/DV17/speakers/:speakerId', (request, response) => {
    let speakerId = request.params.speakerId;
    let url = devoxxSpeakersEndpoint + '/' + speakerId;

    req('GET', url ).then((res) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = 404;
        response.write("No speaker was returned for the supplied speaker id");
        response.end();
    })
});

/**
 * GET - Talks
 * Returns information about the Talk
 * @Params talkId
 */
app.get('/api/conferences/DV17/talk', (request, response) => {
    let talkId = request.query.talkId;
    let url = devoxxTalkEndpoint;
    //console.log(url);

    req('GET', url + '?talkId=' + talkId).then((res) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = res.statusCode;
        response.write(res.body);
        response.end();
    }, (err) => {
        response.setHeader('Content-Type', 'application/json');
        response.status = 404;
        response.write("No talk was returned for the supplied id");
        response.end();
    })
});

http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    console.log('Express server listening on port ' + app.get('port'));
});

module.exports = app;