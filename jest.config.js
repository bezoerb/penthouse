module.exports = {
  testTimeout: 30000, // Increase timeout to 30 seconds
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleFileExtensions: ['js'],
  testMatch: ['**/test/**/*.test.js']
}


