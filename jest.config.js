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
};
