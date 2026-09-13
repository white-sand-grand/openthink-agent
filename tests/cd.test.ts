import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { call } from '../src/commands/cd/cd.js'
import { getCwd } from '../src/utils/cwd.js'

test('cd changes directory and preserves it on failure', async () => {
  const original = process.cwd()
  const dir = mkdtempSync(`${tmpdir()}/openthink-cd-`)
  try {
    expect((await call('', {} as never)).type).toBe('text')
    expect(await call(dir, {} as never)).toEqual({ type: 'text', value: `Changed directory to: ${dir}` })
    expect(getCwd()).toBe(dir)
    expect((await call('missing-directory', {} as never)).type).toBe('text')
    expect(getCwd()).toBe(dir)
  } finally {
    process.chdir(original)
    rmSync(dir, { recursive: true, force: true })
  }
})
