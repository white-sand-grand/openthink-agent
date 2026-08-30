import { type SettingsJson, SettingsSchema } from '../../utils/settings/types.js'

// ─── Zod introspection helpers ───

function unwrapOptional(schema: unknown): unknown {
  const s = schema as { isOptional?: () => boolean; isNullable?: () => boolean; unwrap: () => unknown }
  while ((s.isOptional?.() || s.isNullable?.()) && typeof s.unwrap === 'function') {
    // description lives on the outer wrapper, preserve it
    const desc = (schema as { description?: string }).description
    schema = s.unwrap()
    if (desc && !(schema as { description?: string }).description) {
      ;(schema as { description: string }).description = desc
    }
  }
  return schema
}

function getSchemaDescription(schema: unknown): string | undefined {
  return (schema as { description?: string }).description
}

function getSchemaType(schema: unknown): string {
  const inner = unwrapOptional(schema)
  const name = (inner as { constructor: { name: string } }).constructor?.name ?? 'unknown'
  const typeMap: Record<string, string> = {
    ZodString: 'string',
    ZodNumber: 'number',
    ZodBoolean: 'boolean',
    ZodEnum: 'enum',
    ZodObject: 'object',
    ZodArray: 'array',
    ZodRecord: 'record',
    ZodLiteral: 'string',
    ZodDate: 'date',
    ZodURL: 'url',
  }
  return typeMap[name] ?? name.replace('Zod', '').toLowerCase()
}

function getEnumValues(schema: unknown): string[] | undefined {
  const inner = unwrapOptional(schema)
  const enumSchema = inner as { options?: string[] }
  return enumSchema.options
}

function isSimpleType(schema: unknown): boolean {
  const inner = unwrapOptional(schema)
  const name = (inner as { constructor: { name: string } }).constructor?.name ?? ''
  return ['ZodString', 'ZodNumber', 'ZodBoolean', 'ZodEnum', 'ZodLiteral'].includes(name)
}

// ─── Extract keys from SettingsSchema ───

export interface ConfigKeyInfo {
  key: string
  type: string
  values?: string[]
  description: string
}

export function getSettingsConfigurableKeys(): ConfigKeyInfo[] {
  const zodSchema = SettingsSchema()
  const shape = (zodSchema as { shape: Record<string, unknown> }).shape
  if (!shape) return []

  const keys: ConfigKeyInfo[] = []
  for (const [key, schema] of Object.entries(shape)) {
    // Skip complex types (objects, arrays, records)
    if (!isSimpleType(schema)) continue
    // Skip $schema key
    if (key === '$schema') continue

    const type = getSchemaType(schema)
    const values = type === 'enum' ? getEnumValues(schema) : undefined
    const description = getSchemaDescription(schema) ?? ''

    keys.push({ key, type, values, description })
  }
  return keys
}

// ─── GlobalConfig keys with type info ───

const GLOBAL_CONFIG_ENTRIES: ConfigKeyInfo[] = [
  { key: 'theme', type: 'enum', values: ['classic', 'light', 'dark'], description: 'UI color theme' },
  { key: 'verbose', type: 'boolean', description: 'Show extended status information' },
  { key: 'autoUpdates', type: 'boolean', description: 'Automatically download and install updates' },
  { key: 'autoCompactEnabled', type: 'boolean', description: 'Auto-compact context when nearing limit' },
  { key: 'showTurnDuration', type: 'boolean', description: 'Show how long each turn took' },
  { key: 'editorMode', type: 'enum', values: ['vim', 'emacs', 'default'], description: 'Keybinding mode for text editing' },
  { key: 'diffTool', type: 'string', description: 'External diff tool command' },
  { key: 'respectGitignore', type: 'boolean', description: 'Respect .gitignore when searching files' },
  { key: 'copyFullResponse', type: 'boolean', description: 'Copy complete assistant responses' },
  { key: 'copyOnSelect', type: 'boolean', description: 'Copy text to clipboard on selection' },
  { key: 'terminalProgressBarEnabled', type: 'boolean', description: 'Show progress bar in terminal tab title' },
]

// ─── Help text formatting ───

function formatKeyLine(info: ConfigKeyInfo): string {
  const typeLabel = info.values
    ? `${info.type}(${info.values.join('/')})`
    : info.type
  const desc = info.description ? ` — ${info.description}` : ''
  return `  ${info.key.padEnd(30)} ${typeLabel.padEnd(20)}${desc}`
}

export function buildConfigHelpText(): string {
  const settingsKeys = getSettingsConfigurableKeys()
  const lines: string[] = []

  lines.push('Available settings:')
  lines.push('')

  if (settingsKeys.length > 0) {
    lines.push('Settings (settings.json):')
    for (const key of settingsKeys) {
      lines.push(formatKeyLine(key))
    }
    lines.push('')
  }

  lines.push('Global config:')
  for (const key of GLOBAL_CONFIG_ENTRIES) {
    lines.push(formatKeyLine(key))
  }
  lines.push('')
  lines.push('Usage: /config <key>=<value>')
  lines.push('  /config verbose=true')
  lines.push('  /config theme=dark')
  lines.push('  /config effortLevel=high')
  lines.push('  /config outputStyle=Concise')
  lines.push('')
  lines.push('For complex values (objects, arrays), use the config panel: /config')

  return lines.join('\n')
}
