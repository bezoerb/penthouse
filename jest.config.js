module.exports = {
  testTimeout: 30000, // Increase timeout to 30 seconds
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [],
  moduleFileExtensions: ['js'],
  testMatch: ['**/test/**/*.test.js'],
  // Force Jest to exit after tests complete
  forceExit: true,
  // Detect open handles to help with debugging
  detectOpenHandles: true,
  // Run tests in sequence to avoid worker process issues
  maxWorkers: 1
}


