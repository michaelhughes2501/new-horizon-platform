// eslint.config.js — flat config (ESLint 9+)
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Only the two long-standing hooks rules — this is a React 18 app,
      // not React Compiler, so the newer compiler-oriented rules bundled
      // into eslint-plugin-react-hooks v7's "recommended" preset (e.g.
      // set-state-in-effect, purity, gating) don't apply here and would
      // flag idiomatic React 18 data-fetching patterns as errors.
      //
      // NOTE: previously this spread `reactHooks.configs.recommended.rules`
      // and then overrode just these two keys — since a spread doesn't
      // remove the other keys, that left every compiler rule active as an
      // error despite this comment's stated intent. Enumerate explicitly
      // instead of spreading so the config actually matches the intent.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
