import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import i18nextPlugin from 'eslint-plugin-i18next';
import prettierConfig from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export const base = [
  ...tseslint.configs.strictTypeChecked,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },
];

/** @type {import('eslint').Linter.Config[]} */
export const react = [
  ...base,
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      i18next: i18nextPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'i18next/no-literal-string': ['warn', {
        markupOnly: true,
        ignoreAttribute: ['className', 'testID', 'accessibilityRole', 'name'],
      }],
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../features/*', '../../features/*', '../../../features/*'],
            message: 'Cross-feature imports are forbidden. Move shared code to src/shared/.',
          },
        ],
      }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
