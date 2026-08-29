import {
  getSettingsForSource,
  updateSettingsForSource,
} from '../settings/settings.js'
import type { SettingsJson } from '../settings/types.js'
import {
  getActiveProviderId,
  getProviderEntry,
} from './apiProviders.js'
import { getProviderKey } from './providerKeys.js'

/**
 * Model slots — role-based routing on top of providers.
 *
 * Four fixed slots, each independently bound to a provider + model:
 *
 *   Architect  strongest tier; plans and designs; plan-mode default
 *   Artisan    long-context coding workhorse; main-loop default
 *   Seer       multimodal "eyes"; relays images for vision-less models
 *   Clerk      cheap utility tier: safety classification, summaries
 *
 * The slots are pure mechanism: the project ships no vendor defaults. A slot
 * the user never configures falls back through legacy env vars to the
 * built-in model chain, so zero-config behavior matches the pre-slot CLI.
 * Old family aliases (opus/sonnet/haiku/best) resolve through the same
 * slots, so existing settings and agent frontmatter keep working.
 */

export type SlotId = 'architect' | 'artisan' | 'seer' | 'clerk'

export type SlotDefinition = {
  id: SlotId
  name: string
  /** short label shown next to the name in pickers */
  label: string
  /** role description, surfaced in /model and the README */
  description: string
}

export const MODEL_SLOTS: SlotDefinition[] = [
  {
    id: 'architect',
    name: 'Architect',
    label: '运筹',
    description: '最强档：制定计划与方案设计，plan 模式默认；可以是最贵的',
  },
  {
    id: 'artisan',
    name: 'Artisan',
    label: '锻造',
    description: '长上下文持续编码：精准执行计划与代码修改，主循环默认',
  },
  {
    id: 'seer',
    name: 'Seer',
    label: '洞察',
    description: '多模态之眼：日常轻量任务；为无视觉的模型转述图像',
  },
  {
    id: 'clerk',
    name: 'Clerk',
    label: '文书',
    description: '后勤文书：安全分类、上下文总结等小判断任务，消耗最低',
  },
]

export function getSlotDefinition(id: SlotId): SlotDefinition {
  return MODEL_SLOTS.find(s => s.id === id)!
}

export type SlotConfig = {
  /** provider id from the /provider registry; unset = follow the active provider */
  provider?: string
  /** model id at that provider */
  model?: string
  /** declare that this slot's model accepts images (declaration, not probing) */
  supportsVision?: boolean
}

type SlotSettings = Partial<Record<SlotId, SlotConfig>>

function readSlotSettings(): SlotSettings {
  return getSettingsForSource('userSettings')?.modelSlots ?? {}
}

export function getSlotConfig(slot: SlotId): SlotConfig | undefined {
  const cfg = readSlotSettings()[slot]
  return cfg && typeof cfg === 'object' && (cfg.model || cfg.provider)
    ? cfg
    : undefined
}

/** The user-configured model for a slot, or undefined when not configured. */
export function getSlotUserModel(slot: SlotId): string | undefined {
  const model = readSlotSettings()[slot]?.model
  return typeof model === 'string' && model.trim() !== ''
    ? model.trim()
    : undefined
}

/** The provider a slot is pinned to, or undefined when following the active one. */
export function getSlotProviderId(slot: SlotId): string | undefined {
  const provider = readSlotSettings()[slot]?.provider
  return typeof provider === 'string' && provider !== '' ? provider : undefined
}

export function getSlotSupportsVision(slot: SlotId): boolean {
  return readSlotSettings()[slot]?.supportsVision === true
}

export function setSlotConfig(slot: SlotId, config: SlotConfig): void {
  const current = readSlotSettings()
  updateSettingsForSource('userSettings', {
    modelSlots: { ...current, [slot]: config },
  } as unknown as SettingsJson)
}

/**
 * Legacy env fallbacks per slot — kept so pre-slot setups
 * (ANTHROPIC_DEFAULT_*_MODEL / ANTHROPIC_SMALL_FAST_MODEL) keep working.
 * A configured slot always wins over these.
 */
const SLOT_ENV_FALLBACK: Record<SlotId, string | undefined> = {
  architect: undefined,
  artisan: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
  seer: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
  clerk: process.env.ANTHROPIC_SMALL_FAST_MODEL || process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
}

/**
 * Resolved model for a slot: user config first, then the slot's legacy env
 * fallback. Returns undefined when the slot is fully unconfigured — callers
 * apply their own built-in default after that.
 */
export function getSlotResolvedModel(slot: SlotId): string | undefined {
  return getSlotUserModel(slot) ?? SLOT_ENV_FALLBACK[slot]
}

/**
 * Per-slot provider client override. When a slot pins a provider and its
 * configured model matches the requested model, requests for that model go
 * to the pinned provider instead of the globally active one.
 */
export function getSlotProviderOverrideForModel(model: string): {
  id: string
  baseUrl: string
  apiKey: string
  protocol: 'anthropic' | 'openai'
  slot: SlotId
} | null {
  for (const def of MODEL_SLOTS) {
    const cfg = getSlotConfig(def.id)
    if (!cfg?.provider || cfg.model !== model) continue
    const entry = getProviderEntry(cfg.provider)
    const apiKey = getProviderKey(cfg.provider)
    if (!entry || !apiKey || !entry.baseUrl) continue
    const protocol =
      entry.protocol === 'openai' || entry.protocol === 'anthropic'
        ? entry.protocol
        : entry.detectedProtocol ?? 'anthropic'
    return {
      id: cfg.provider,
      baseUrl: entry.baseUrl,
      apiKey,
      protocol,
      slot: def.id,
    }
  }
  return null
}

/**
 * Human-readable slot context for a model, e.g. "Architect 槽 · GLM" —
 * appended to provider error messages so users know which slot's provider
 * to fix. Returns null when the model isn't slot-routed.
 */
export function getSlotErrorContext(model: string): string | null {
  for (const def of MODEL_SLOTS) {
    const cfg = getSlotConfig(def.id)
    if (cfg?.model !== model) continue
    const providerId = cfg.provider ?? getActiveProviderId()
    if (!providerId) return `${def.name} 槽`
    const name = getProviderEntry(providerId)?.name ?? providerId
    return `${def.name} 槽 · ${name}`
  }
  return null
}
