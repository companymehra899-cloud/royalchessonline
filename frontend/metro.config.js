// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const http = require('http');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Reverse proxy /api requests to the backend server (single-port preview)
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '8000', 10);
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    if (req.url.startsWith('/api')) {
      const proxyReq = http.request({
        host: '127.0.0.1',
        port: BACKEND_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: '127.0.0.1:' + BACKEND_PORT },
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', () => {
        res.statusCode = 502;
        res.end('Bad Gateway');
      });
      req.pipe(proxyReq);
    } else {
      middleware(req, res, next);
    }
  };
};


// // Exclude unnecessary directories from file watching
// config.watchFolders = [__dirname];
// config.resolver.blacklistRE = /(.*)\/(__tests__|android|ios|build|dist|.git|node_modules\/.*\/android|node_modules\/.*\/ios|node_modules\/.*\/windows|node_modules\/.*\/macos)(\/.*)?$/;

// // Alternative: use a more aggressive exclusion pattern
// config.resolver.blacklistRE = /node_modules\/.*\/(android|ios|windows|macos|__tests__|\.git|.*\.android\.js|.*\.ios\.js)$/;

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

const BACKEND_TARGET = process.env.EXPO_PUBLIC_BACKEND_TARGET || 'http://127.0.0.1:8000';

const proxyHandler = (req, res) => {
  const backendUrl = new URL(BACKEND_TARGET);
  const proxyReq = http.request({
    hostname: backendUrl.hostname,
    port: backendUrl.port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: backendUrl.host },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend unreachable', detail: err.message }));
  });
  req.pipe(proxyReq);
};

config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  if (req.url.startsWith('/api/')) return proxyHandler(req, res);
  return middleware(req, res, next);
};

module.exports = config;
