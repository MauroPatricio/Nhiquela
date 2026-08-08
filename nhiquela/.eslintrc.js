module.exports = {
  root: true,
  extends: ['universe/native', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    'no-unused-vars': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
};
