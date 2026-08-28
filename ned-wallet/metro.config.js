const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve('stream-browserify'),
  crypto: require.resolve('crypto-browserify'),
  events: require.resolve('events'),
  process: require.resolve('process/browser'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  zlib: require.resolve('browserify-zlib'),
  path: require.resolve('path-browserify'),
  buffer: require.resolve('buffer'),
  util: require.resolve('util'),
  assert: require.resolve('assert'),
  url: require.resolve('url'),
};

module.exports = config;
