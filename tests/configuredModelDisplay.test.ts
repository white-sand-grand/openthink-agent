import { expect, test } from 'bun:test'
import { hasConfiguredDisplayModel } from '../src/utils/model/configuredModelDisplay.js'

test('empty and unrelated slots do not expose a built-in vendor model', () => {
  expect(hasConfiguredDisplayModel(null, {}, {})).toBe(false)
  expect(hasConfiguredDisplayModel(null, { architect: 'planner' }, {})).toBe(false)
  expect(hasConfiguredDisplayModel('sonnet', {}, {})).toBe(false)
  expect(hasConfiguredDisplayModel('opus[1m]', {}, {})).toBe(false)
  expect(hasConfiguredDisplayModel(null, { artisan: '   ' }, {})).toBe(false)
})

test('configured default, selected slot aliases and explicit IDs are displayed', () => {
  expect(hasConfiguredDisplayModel(null, { artisan: 'worker-v1' }, {})).toBe(true)
  expect(hasConfiguredDisplayModel('sonnet', { seer: 'vision-v2' }, {})).toBe(true)
  expect(hasConfiguredDisplayModel('best', { architect: 'planner' }, {})).toBe(true)
  expect(hasConfiguredDisplayModel('custom-model', {}, {})).toBe(true)
  expect(hasConfiguredDisplayModel('claude-sonnet-4-6', {}, {})).toBe(true)
  expect(hasConfiguredDisplayModel('sonnet', {}, { ANTHROPIC_DEFAULT_SONNET_MODEL: 'legacy-model' })).toBe(true)
})
