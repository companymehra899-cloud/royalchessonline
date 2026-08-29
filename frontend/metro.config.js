// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');
const http = require('http');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];


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
// Bind to all interfaces so the dev server is reachable through Docker port mapping.
config.server.host = '0.0.0.0';
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  if (req.url.startsWith('/api/')) return proxyHandler(req, res);
  return middleware(req, res, next);
};

module.exports = config;
