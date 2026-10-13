/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('nav clearance', () => {
  // jsdom's URL rejects vitest's import.meta.url, so resolve from the project root.
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

  it('reserves the nav band at the bottom of main via the shared token', () => {
    const main = css.match(/\n\s*main\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(main).toContain('var(--nav-clearance)')
  })

  it('does not keep a second, hand-written copy of the nav height in main', () => {
    const main = css.match(/\n\s*main\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(main).not.toMatch(/4rem/)
  })
})
