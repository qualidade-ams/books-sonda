import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'sync-api/**',
      'supabase/functions/**',
      'public/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
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
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // TypeScript propositalmente relaxado neste projeto (ver CLAUDE.md /
      // tsconfig.app.json: strict: false, noImplicitAny: false). Estas regras
      // ficam desligadas ou como warning para não gerar centenas de erros
      // retroativos em código existente — o objetivo é um baseline que rode,
      // não reescrever o projeto inteiro. Regras que pegam bug real (hooks
      // condicionais, expressão sempre constante, etc.) continuam error.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-case-declarations': 'warn',
      'prefer-const': 'warn',
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'no-constant-condition': 'warn',
    },
  },
  {
    files: ['*.config.{js,ts}', 'tailwind.config.ts', 'postcss.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}'],
    rules: {
      // require() dinâmico é um padrão comum de mock em teste
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
