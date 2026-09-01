require('@babel/register')({ presets: ['@babel/preset-env'] });
const api = require('./hooks/createConnectionApi').default;

console.log('--- TEST RESULTS ---');
console.log('Base URL:', api.defaults.baseURL);
console.log('Timeout:', api.defaults.timeout);
console.log('--------------------');
