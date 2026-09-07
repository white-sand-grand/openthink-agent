import { expect, mock, test } from 'bun:test'

let config: { tui?: string } = { tui: 'classic' }
mock.module('../src/utils/config.js', () => ({
  getGlobalConfig: () => config,
  saveGlobalConfig: (update: (value: typeof config) => typeof config) => { config = update(config) },
}))
mock.module('../src/bootstrap/state.js', () => ({ getIsInteractive: () => true }))
mock.module('../src/utils/debug.js', () => ({ logForDebugging: () => {} }))
mock.module('../src/utils/execFileNoThrow.js', () => ({ execFileNoThrow: async () => ({ stdout: '0' }) }))

const { isFullscreenEnvEnabled } = await import('../src/utils/fullscreen.js')
const { call } = await import('../src/commands/tui/tui.js')

test('renderer commands use the active mode and respect alternate-screen prohibition', async () => {
  const original = { ...process.env }
  const replies: string[] = []
  let updates = 0
  const context = { setAppState: () => { updates++ } } as unknown as Parameters<typeof call>[1]
  const done = ((message: string) => { replies.push(message) }) as Parameters<typeof call>[0]
  try {
    delete process.env.TMUX
    delete process.env.OPENTHINK_DISABLE_ALTERNATE_SCREEN
    process.env.OPENTHINK_NO_FLICKER = '1'
    expect(isFullscreenEnvEnabled()).toBe(true)
    await call(done, context)
    expect(isFullscreenEnvEnabled()).toBe(false)
    expect(config.tui).toBe('classic')
    await call(done, context)
    expect(isFullscreenEnvEnabled()).toBe(true)
    process.env.OPENTHINK_DISABLE_ALTERNATE_SCREEN = '1'
    expect(isFullscreenEnvEnabled()).toBe(false)
    const previousUpdates = updates
    const previousConfig = config
    await call(done, context, 'fullscreen')
    expect(replies.at(-1)).toContain('Cannot enable fullscreen')
    expect(updates).toBe(previousUpdates)
    expect(config).toBe(previousConfig)
    await call(done, context, 'invalid')
    expect(replies.at(-1)).toContain('Unknown renderer')
    expect(updates).toBe(previousUpdates)
  } finally {
    for (const key of ['TMUX', 'OPENTHINK_NO_FLICKER', 'OPENTHINK_DISABLE_ALTERNATE_SCREEN']) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  }
})
