// @ts-check
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig([
  // 1. Global Ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      'docs/.vitepress/',
      'depend/',
      'build/',
      'build-linux/'
    ],
  },

  // 2. Base Configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Main Rule Configurations
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      // --- WHITESPACE & FORMATTING RULES (Active) ---
      '@stylistic/indent': ['error', 2],           // Enforces strict 2-space indentation
      '@stylistic/no-trailing-spaces': 'error',    // Disallows trailing spaces
      '@stylistic/space-infix-ops': 'error',       // Enforces spaces around operators
      '@stylistic/comma-spacing': ['error', { before: false, after: true }],

      // --- SILENCED WARNINGS (Disabled) ---
      '@typescript-eslint/no-explicit-any': 'off',          // Completely silences 'any' warnings
      '@typescript-eslint/no-unsafe-function-type': 'off',  // Silences Generic Function type warnings
      '@typescript-eslint/no-unused-vars': 'off'            // Silences unused variable/argument warnings
    }
  }
]);
