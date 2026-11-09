module.exports = {
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/tests/**/*.test.(ts|js)'],
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/declaration/', '/dist/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(babylonjs|@babylonjs)/)'
  ],
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['<rootDir>/tests/setup.ts'],
  // Babylon.js is large: the first run transforms it, later runs use Jest's cache.
  testTimeout: 30000,
};
