import type { ToolUseContext } from '../../Tool.js'
import type {
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'
import {
  isGlobalConfigKey,
  saveGlobalConfig,
} from '../../utils/config.js'
import {
  buildConfigHelpText,
  type ConfigKeyInfo,
  getSettingsConfigurableKeys,
} from './config-help.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'
import { Settings } from '../../components/Settings/Settings.js'

function coerceValue(raw: string, type: string, values?: string[]): { ok: true; value: unknown } | { ok: false; error: string } {
  if (type === 'boolean') {
    const lower = raw.toLowerCase()
    if (lower === 'true') return { ok: true, value: true }
    if (lower === 'false') return { ok: true, value: false }
    return { ok: false, error: `Expected true or false, got "${raw}"` }
  }

  if (type === 'enum' && values) {
    const lower = raw.toLowerCase()
    const matched = values.find(v => v.toLowerCase() === lower)
    if (matched) return { ok: true, value: matched }
    return { ok: false, error: `Invalid value. Valid options: ${values.join(', ')}` }
  }

  if (type === 'number') {
    const num = Number(raw)
    if (Number.isNaN(num)) return { ok: false, error: `Expected a number, got "${raw}"` }
    return { ok: true, value: num }
  }

  // string, literal, etc. — pass through
  return { ok: true, value: raw }
}

function findKeyInfo(key: string): { info: ConfigKeyInfo; source: 'global' | 'settings' } | null {
  // Check GlobalConfig first
  if (isGlobalConfigKey(key)) {
    const settingsKeys = getSettingsConfigurableKeys()
    const found = settingsKeys.find(k => k.key === key)
    if (found) return { info: found, source: 'settings' }
    // Hardcoded GlobalConfig entry
    const globalEntries: ConfigKeyInfo[] = [
      { key: 'theme', type: 'enum', values: ['classic', 'light', 'dark'], description: 'UI color theme' },
      { key: 'verbose', type: 'boolean', description: 'Show extended status information' },
      { key: 'autoUpdates', type: 'boolean', description: 'Automatically download and install updates' },
      { key: 'autoCompactEnabled', type: 'boolean', description: 'Auto-compact context when nearing limit' },
      { key: 'showTurnDuration', type: 'boolean', description: 'Show how long each turn took' },
      { key: 'editorMode', type: 'enum', values: ['vim', 'emacs', 'default'], description: 'Keybinding mode for text editing' },
      { key: 'respectGitignore', type: 'boolean', description: 'Respect .gitignore when searching files' },
      { key: 'copyFullResponse', type: 'boolean', description: 'Copy complete assistant responses' },
      { key: 'copyOnSelect', type: 'boolean', description: 'Copy text to clipboard on selection' },
    ]
    const globalFound = globalEntries.find(k => k.key === key)
    if (globalFound) return { info: globalFound, source: 'global' }
  }

  // Check SettingsJson keys
  const settingsKeys = getSettingsConfigurableKeys()
  const found = settingsKeys.find(k => k.key === key)
  if (found) return { info: found, source: 'settings' }

  return null
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: ToolUseContext & LocalJSXCommandContext,
  args?: string,
): Promise<React.ReactNode> {
  const trimmed = args?.trim() || ''

  // --help path
  if (trimmed === '--help' || trimmed === 'help' || trimmed === '-h') {
    onDone(buildConfigHelpText(), { display: 'system' })
    return null
  }

  // key=value path
  if (trimmed.includes('=')) {
    const eqIndex = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIndex).trim()
    const rawValue = trimmed.slice(eqIndex + 1).trim()

    if (!key) {
      onDone('Usage: /config <key>=<value>\nMissing key before "=".', { display: 'system' })
      return null
    }

    const keyInfo = findKeyInfo(key)
    if (!keyInfo) {
      onDone(`Unknown setting: "${key}". Run /config --help to see available keys.`, { display: 'system' })
      return null
    }

    const coerced = coerceValue(rawValue, keyInfo.info.type, keyInfo.info.values)
    if (!coerced.ok) {
      const valuesHint = keyInfo.info.values
        ? ` Valid options: ${keyInfo.info.values.join(', ')}`
        : ''
      onDone(`Invalid value for ${key}: "${rawValue}". ${coerced.error}${valuesHint}`, { display: 'system' })
      return null
    }

    if (keyInfo.source === 'global') {
      saveGlobalConfig(current => ({
        ...current,
        [key]: coerced.value,
      }))
      onDone(`Set ${key} to ${coerced.value}`, { display: 'system' })
    } else {
      const result = updateSettingsForSource('userSettings', {
        [key]: coerced.value,
      } as unknown as import('../../utils/settings/types.js').SettingsJson)
      if (result.error) {
        onDone(`Failed to set ${key}: ${result.error.message}`, { display: 'system' })
        return null
      }
      onDone(`Set ${key} to ${coerced.value}`, { display: 'system' })
    }
    return null
  }

  // No args — open panel
  if (!trimmed) {
    return <Settings onClose={onDone} context={context} defaultTab="Config" />
  }

  // Single word with no = — treat as --help
  onDone(`Usage: /config <key>=<value> or /config --help\n\nRun /config --help to see all available settings.`, { display: 'system' })
  return null
}
