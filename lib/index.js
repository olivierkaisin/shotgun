'use strict';

var express = require('express'),
    webshot = require('webshot'),
    types   = require('./types.js'),
    uuid    = require('uuid'),
    fs      = require('fs'),
    path    = require('path'),
    gm      = require('gm'),
    bunyan  = require('bunyan'),
    logger;

var app = express();
app.set('port', process.env.APP_PORT || process.env.PORT || 3000);
app.set('env', process.env.NODE_ENV || 'production');

logger = bunyan.createLogger({
  name: 'shotgun',
  level: (app.get('env') !== 'test') ? 'info' : 'debug'
});

// Init middlewares and start server
app
  .use(app.router)
  .listen(app.get('port'));

logger.info(
  'Server started on %s at: %s', app.get('port'), new Date().toUTCString()
);

// Healthcheck page
app.get('/healthcheck', function (req, res) {
  res.send(200, 'OK!');
});

// Screenshot pages
app.get('/:type(iphone|desktop-large|desktop-small)', function (req, res) {
  var startTime = Date.now();

  if (req.query.url === undefined) {
    res.send(400, 'Please provide a url');
    return;
  }

  if (req.query.webhook !== undefined) {
    res.send('Request for "' + req.query.url + '" received');
  }

  var options = {};
  if (req.params.type === 'custom') {
    options = req.params;
  } else {
    options = types[req.params.type];
    options.shotSize = { width: 'all', height: 'all' };
    options.timeout = req.query.timeout || 20000;
    options.renderDelay = req.query.delay || 1000;
    options.errorIfStatusIsNot200 = true;
    options.onInitialized = {
      fn: require('./prerender/remove-belowfold-images'),
      context: {
        foldHeight: options.innerHeight
      }
    };
    options.phantomConfig = {
      'ignore-ssl-errors': 'true',
      'ssl-protocol': 'tlsv1',
      'web-security': 'no'
    };
  }

  var shotPath = path.resolve('/tmp', uuid.v4() + '.png');
  logger.debug('Will save shot to tmp file %s', shotPath);

  var calledBack = false;
  webshot(req.query.url, shotPath, options, function (err) {
    if (calledBack) {
      return;
    }

    calledBack = true;
    var hasData = false;

    if (err) {
      logger.error({url: req.query.url, component: 'webshot'}, err);
    }

    var readStream = fs.createReadStream(shotPath);

    gm(readStream)
      .resize(options.crop.width)
      .crop(options.crop.width, options.crop.height)
      .resize(options.resize.width, options.resize.height)
      .stream(function (err, stdout, stderr) {
        if (err) {
          logger.error({url: req.query.url, component: 'resizer'}, err);
        }

        stderr.on('data', function (data) {
          logger.error(
            {url: req.query.url, component: 'stream'},
            data.toString()
          );
        });

        if (req.query.webhook === undefined) {
          stdout.on('data', function (data) {
            if (!hasData) {
              hasData = true;
              res.contentType('image/png');
            }

            res.write(data);
          });

          stdout.on('end', function () {
            if (!hasData) {
              res.send(500, 'Something went wrong');
            } else {
              logger.info({
                url: req.query.url,
                time: Date.now() - startTime,
                type: req.params.type
              });
              res.send();
            }

            // clean-up tmp file
            readStream.close();

            fs.unlink(shotPath, function (err) {
              if (err) {
                logger.error('Could not clean up tmp file', err);
              } else {
                logger.debug('Tmp file has been cleaned up');
              }
            });
          });
        } else {
          // POST to webhook
          var url = require('url').parse(req.query.webhook);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            var request = require('request');
            stdout.pipe(request.post(req.query.webhook, function (err) {
              if (err) {
                logger.error({url: req.query.url, component: 'webhook'}, err);
              }
            }));
          }
        }
      });
  });
});

module.exports = app;
