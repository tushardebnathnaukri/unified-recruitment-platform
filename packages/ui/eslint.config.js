import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'storybook-static']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // shadcn components export their `cva` variants next to the component
    // (`export { Button, buttonVariants }`), which the fast-refresh rule flags.
    // That is the upstream shape of every component the CLI generates, so the
    // rule is off here rather than patched into each new file. It stays on in
    // apps/web, where HMR boundaries actually matter.
    files: ['src/components/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
