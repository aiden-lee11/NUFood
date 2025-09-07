module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // expo-router/babel is deprecated on SDK 50+; handled by preset
      'react-native-reanimated/plugin',
    ],
  };
};


