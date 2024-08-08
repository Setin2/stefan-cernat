module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }], // Transpile ES6+ to ES5
    '@babel/preset-typescript' // Support TypeScript
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs' // Convert ES modules to CommonJS
  ],
  ignore: [
    // Avoid ignoring files in node_modules; we will handle this in Jest config
  ]
};
