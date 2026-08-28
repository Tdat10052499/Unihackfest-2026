const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  stream: require.resolve('stream-browserify'),
  crypto: require.resolve('crypto-browserify'),
  events: require.resolve('events'),
  process: require.resolve('process/browser'),
  buffer: require.resolve('buffer'),
  zlib: require.resolve('browserify-zlib'),
  util: require.resolve('util/'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  url: require.resolve('url/'),
  os: require.resolve('os-browserify/browser'),
  path: require.resolve('path-browserify'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'jose' || moduleName.startsWith('jose/')) {
    return context.resolveRequest(
      {
        ...context,
        unstable_conditionNames: ['browser', 'require', 'react-native'],
      },
      moduleName,
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;