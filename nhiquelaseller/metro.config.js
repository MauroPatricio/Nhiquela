const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Remover unstable_workerThreads para evitar warning de validação no EAS
if (config.watcher && config.watcher.unstable_workerThreads !== undefined) {
  delete config.watcher.unstable_workerThreads;
}

module.exports = config;
