const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(function (req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost:' + PORT);
  const pathname = parsedUrl.pathname;

  // Proxy endpoint for Brave Search
  if (pathname === '/api/search' && req.method === 'POST') {
    var body = '';
    req.on('data', function (chunk) { body += chunk; });
    req.on('end', function () {
      var config;
      try {
        config = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      var query = config.query;
      var apiKey = config.apiKey;

      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Query is required' }));
        return;
      }
      if (!apiKey) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API key is required' }));
        return;
      }

      var braveUrl = 'https://api.search.brave.com/res/v1/web/search?q=' + encodeURIComponent(query);

      var braveReq = https.request(braveUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      }, function (braveRes) {
        var data = [];
        braveRes.on('data', function (chunk) { data.push(chunk); });
        braveRes.on('end', function () {
          var responseHeaders = { 'Content-Type': 'application/json' };
          if (braveRes.statusCode === 401 || braveRes.statusCode === 403) {
            responseHeaders['X-Auth-Error'] = 'true';
          }
          res.writeHead(braveRes.statusCode, responseHeaders);
          res.end(Buffer.concat(data));
        });
      });

      braveReq.on('error', function (e) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to reach Brave Search API: ' + e.message }));
      });

      braveReq.setTimeout(15000, function () {
        braveReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Brave Search API request timed out' }));
      });

      braveReq.end();
    });
    return;
  }

  // Serve static files
  var filePath = pathname === '/' ? '/chat.html' : pathname;
  var fullPath = path.join(__dirname, filePath);
  var ext = path.extname(fullPath);
  var contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(fullPath, function (err, content) {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, function () {
  console.log('Server running at http://localhost:' + PORT);
});
