// PostToolUse hook (Edit|Write): runs tsc -b --noEmit after touching a
// .ts/.tsx file, so a type error surfaces right away instead of only at the
// end of a task or in CI.
// .cjs extension: the project's package.json sets "type": "module", so a
// plain .js file here would be loaded as ESM and `require` would fail.
const { execSync } = require('node:child_process')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..', '..')

let data = ''
process.stdin.on('data', (chunk) => {
  data += chunk
})
process.stdin.on('end', () => {
  let filePath = ''
  try {
    const input = JSON.parse(data)
    filePath = (input.tool_input && input.tool_input.file_path) || (input.tool_response && input.tool_response.filePath) || ''
  } catch {
    // malformed input: nothing to check
  }
  if (!/\.tsx?$/.test(filePath)) {
    console.log('{}')
    return
  }
  try {
    execSync('npx tsc -b --noEmit', { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] })
    console.log('{}')
  } catch (err) {
    const output = `${err.stdout || ''}${err.stderr || ''}`.toString().slice(0, 4000)
    console.log(
      JSON.stringify({
        decision: 'block',
        reason: `Typecheck-Fehler nach dem Edit:\n${output}`,
      }),
    )
  }
})
