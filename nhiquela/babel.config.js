module.exports = function(api) {
  api.cache(true);
  
  const plugins = [
    ["module:react-native-dotenv", {
      "envName": "APP_ENV",
      "moduleName": "@env",
      "path": ".env",
    }],
    'react-native-reanimated/plugin'
  ];

  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: plugins
  };
};
