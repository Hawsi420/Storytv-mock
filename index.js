const fs = require('fs');
const path = require('path');

// HAR data load karein (relative to project root)
const harFilePath = path.join(__dirname, '..', 'apidetails.txt');
let harData;
try {
  const fileContent = fs.readFileSync(harFilePath, 'utf8');
  harData = JSON.parse(fileContent);
} catch (err) {
  console.error('Error reading apidetails.txt:', err.message);
  // Fallback dummy data (avoid crash)
  harData = { log: { entries: [] } };
}

// Route map: key = METHOD + pathname (without query)
const routeMap = new Map();
harData.log.entries.forEach(entry => {
  const req = entry.request;
  const parsedUrl = new URL(req.url);
  const pathWithoutQuery = parsedUrl.pathname;
  const method = req.method;
  const key = `${method} ${pathWithoutQuery}`;
  const res = entry.response;
  routeMap.set(key, {
    status: res.status,
    headers: res.headers,
    body: res.content.text ? JSON.parse(res.content.text) : null
  });
});

module.exports = (req, res) => {
  // CORS headers (app ke liye)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, languageid, source');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Path se prefix /Storytvfk hatao (agar hai toh)
  let pathname = req.url.split('?')[0]; // remove query string
  const prefix = '/Storytvfk';
  if (pathname.startsWith(prefix)) {
    pathname = pathname.substring(prefix.length);
    if (pathname === '') pathname = '/';
  }

  const key = `${req.method} ${pathname}`;
  const matched = routeMap.get(key);

  if (matched) {
    // Set response headers from HAR (skip content-encoding & length)
    if (matched.headers) {
      matched.headers.forEach(h => {
        const name = h.name.toLowerCase();
        if (name !== 'content-encoding' && name !== 'content-length') {
          res.setHeader(h.name, h.value);
        }
      });
    }
    res.status(matched.status).json(matched.body);
  } else {
    res.status(404).json({ error: 'Mock not found for ' + key });
  }
};