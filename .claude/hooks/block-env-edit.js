// PreToolUse hook (Edit|Write): blocks edits to .env* files.
// Enforces CLAUDE.md's "Secrets-Handling" rule -- these files must never be
// touched by Claude, only by the user, and never committed.
let data = ''
process.stdin.on('data', (chunk) => {
  data += chunk
})
process.stdin.on('end', () => {
  let filePath = ''
  try {
    const input = JSON.parse(data)
    filePath = (input.tool_input && input.tool_input.file_path) || ''
  } catch {
    // malformed input: fall through and allow, rather than block on a parse error
  }
  const base = filePath.split(/[\\/]/).pop() || ''
  // .env.example stays editable (it's the tracked, secret-free template);
  // everything else under the project's own `*.local`/.env gitignore pattern
  // is a real secrets file and gets blocked.
  const isRealEnvFile = base === '.env' || (base.startsWith('.env.') && base.endsWith('.local'))
  if (isRealEnvFile) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            'Secrets-Handling-Regel (CLAUDE.md): .env-Dateien duerfen nicht von Claude editiert werden.',
        },
      }),
    )
  } else {
    console.log('{}')
  }
})
