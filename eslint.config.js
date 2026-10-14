import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const rawButtonSelector = {
  selector: "JSXOpeningElement[name.name='button']",
  message: 'Use <Pressable> from components/Pressable instead of a raw <button> (shared tap feedback).',
}

// Felder, Labels und Pressables tragen ihr Aussehen aus src/lib/ui-classes.ts;
// ohne Klasse fielen sie auf Preflight-Optik zurück (Block-1-Spec).
const designSystemSelectors = [
  {
    selector:
      "JSXOpeningElement[name.name=/^(input|select|textarea)$/]:not(:has(JSXAttribute[name.name='className'])):not(:has(JSXAttribute[name.name='type'][value.value=/^(checkbox|radio|file)$/]))",
    message: 'Felder brauchen inputClass aus lib/ui-classes (Checkbox/Radio/Datei ausgenommen).',
  },
  {
    selector: "JSXOpeningElement[name.name='label']:not(:has(JSXAttribute[name.name='className']))",
    message: 'Labels brauchen fieldLabelClass oder checkLabelClass aus lib/ui-classes.',
  },
  {
    selector:
      "JSXOpeningElement[name.name='Pressable']:not(:has(JSXAttribute[name.name='variant'])):not(:has(JSXAttribute[name.name='className']))",
    message: 'Pressable braucht eine variant (primary/secondary/danger) oder eigenes Aussehen per className.',
  },
]

export default defineConfig([
  globalIgnores(['dist']),
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
    files: ['src/**/*.tsx'],
    // Pressable is the one sanctioned place that renders a raw <button>;
    // tests may render raw buttons as fixtures. `ignores` only exempts these
    // files from THIS object, the rules above still apply to them.
    ignores: ['src/components/Pressable.tsx', '**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': ['error', rawButtonSelector, ...designSystemSelectors],
    },
  },
])
