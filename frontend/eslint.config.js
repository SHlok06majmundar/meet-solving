import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import unusedImports from 'eslint-plugin-unused-imports'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'e2e-dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { 'unused-imports': unusedImports, react },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-no-undef': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  { files: ['e2e/clerk.fixture.jsx'], rules: { 'react-refresh/only-export-components': 'off' } },
  { files: ['vite.config.js', 'postbuild.js', 'api/**/*.js', '**/*.test.js', 'playwright.config.js', 'e2e/**/*.js'], languageOptions: { globals: globals.node } },
])
