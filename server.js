const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

// ── HTML Text Extraction Helpers ──
function stripHtml(html) {
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<[^>]+>/g, ' ');
  html = html.replace(/&nbsp;/gi, ' ');
  html = html.replace(/&amp;/gi, '&');
  html = html.replace(/&lt;/gi, '<');
  html = html.replace(/&gt;/gi, '>');
  html = html.replace(/&quot;/gi, '"');
  html = html.replace(/&#39;/gi, "'");
  html = html.replace(/&ldquo;/gi, '"');
  html = html.replace(/&rdquo;/gi, '"');
  html = html.replace(/&mdash;/gi, '—');
  html = html.replace(/&ndash;/gi, '-');
  html = html.replace(/[\r\n]+/g, '\n');
  html = html.replace(/ {3,}/g, '  ');
  html = html.replace(/\n{3,}/g, '\n\n');
  return html.trim();
}

function extractTitle(html) {
  var match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  var ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch && ogMatch[1]) {
    return ogMatch[1].trim();
  }
  return null;
}

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

  // Proxy endpoint for web fetching
  if (pathname === '/api/fetch' && req.method === 'POST') {
    var fetchBody = '';
    req.on('data', function (chunk) { fetchBody += chunk; });
    req.on('end', function () {
      var config;
      try {
        config = JSON.parse(fetchBody);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      var url = config.url;
      if (!url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL is required' }));
        return;
      }

      // Validate URL protocol
      var parsed;
      try {
        parsed = new URL(url);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid URL' }));
        return;
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Only HTTP/HTTPS URLs allowed' }));
        return;
      }

      var client = parsed.protocol === 'https:' ? https : http;
      var fetchReq = client.request(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenChat/1.0)'
        }
      }, function (fetchRes) {
        // Only process successful HTML/text responses
        var contentType = fetchRes.headers['content-type'] || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
          res.writeHead(415, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unsupported content type: ' + contentType }));
          return;
        }

        var data = [];
        fetchRes.on('data', function (chunk) { data.push(chunk); });
        fetchRes.on('end', function () {
          var html = Buffer.concat(data).toString('utf-8');
          var text = stripHtml(html);
          var title = extractTitle(html);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            title: title,
            text: text,
            url: url,
            truncated: text.length > 4000
          }));
        });
      });

      fetchReq.on('error', function (e) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch URL: ' + e.message }));
      });

      fetchReq.setTimeout(15000, function () {
        fetchReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL fetch request timed out' }));
      });

      fetchReq.end();
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
