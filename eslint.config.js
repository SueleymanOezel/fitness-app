import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Block 1: noch nicht auf ui-classes migrierte Dateien. Jeder Migrations-Task
// entfernt seine Dateien; am Ende ist die Liste leer und wird gelöscht.
const PENDING_MIGRATION = [
  'src/components/AddEntryFlow.tsx',
  'src/components/BodyEntryForm.tsx',
  'src/components/CalorieGoalEditor.tsx',
  'src/components/ExercisePicker.tsx',
  'src/components/FoodEntryEditForm.tsx',
  'src/components/FoodEntryList.tsx',
  'src/components/ManualProductForm.tsx',
  'src/components/ProductPicker.tsx',
  'src/components/charts/ChartPicker.tsx',
  'src/components/charts/ExerciseSelect.tsx',
  'src/pages/BodyEntriesPage.tsx',
  'src/pages/BodyPage.tsx',
  'src/pages/BodyPhotosPage.tsx',
  'src/pages/ExercisesPage.tsx',
  'src/pages/LoginPage.tsx',
  'src/pages/NutritionEntriesPage.tsx',
  'src/pages/NutritionPage.tsx',
  'src/pages/ProfilePage.tsx',
  'src/pages/TrainingHistoryDetailPage.tsx',
  'src/pages/TrainingPlanEditPage.tsx',
  'src/pages/TrainingPlansPage.tsx',
  'src/pages/TrainingPlanWizardPage.tsx',
  'src/pages/WorkoutSessionPage.tsx',
]

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
    ignores: ['src/components/Pressable.tsx', '**/*.test.tsx', ...PENDING_MIGRATION],
    rules: {
      'no-restricted-syntax': ['error', rawButtonSelector, ...designSystemSelectors],
    },
  },
  {
    files: PENDING_MIGRATION,
    rules: {
      'no-restricted-syntax': ['error', rawButtonSelector],
    },
  },
])
