/**
 * CommonJS wrapper for MockDataProvider to support require() in demo servers
 */
const { mockDataProvider } = require('./MockDataProvider.js');

module.exports = { mockDataProvider };