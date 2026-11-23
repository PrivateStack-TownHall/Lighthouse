import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['kit/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], 'no-console': 'error' },
  },
  // Scripts print to the console on purpose.
  { files: ['scripts/**/*.js'], rules: { 'no-console': 'off' } },
];
