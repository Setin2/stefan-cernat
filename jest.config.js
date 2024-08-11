module.exports = {
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': 'babel-jest', // Use babel-jest for transforming files
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/tests/**/*.test.(ts|js)'],
  transformIgnorePatterns: [
    '/node_modules/(?!(babylonjs|@babylonjs)/)' // Ensure Babylon.js files are transformed
  ],
  //testEnvironment: 'node', // Use node environment
  testEnvironment: 'jest-environment-jsdom', // Specify the jsdom environment
};
