import { getInitialMainLoopModel } from '../../bootstrap/state.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import { isModelAllowed } from './modelAllowlist.js'
import {
  getCanonicalName,
  getDefaultMainLoopModel,
  getMarketingNameForModel,
  getUserSpecifiedModelSetting,
  type ModelSetting,
} from './model.js'
import {
  MODEL_SLOTS,
  getSlotDefinition,
  getSlotResolvedModel,
} from './slots.js'
import {
  getActiveProviderId,
  getProviderEntry,
} from './apiProviders.js'
import { getGlobalConfig } from '../config.js'

export type ModelOption = {
  value: ModelSetting
  label: string
  description: string
  descriptionForModel?: string
}

/**
 * The /model lineup is slot-first:
 *
 *   Default (Artisan slot) → the four role slots → the active provider's
 *   model list → custom/current models.
 *
 * There is deliberately no built-in vendor lineup — what models exist is
 * decided by the user's provider configuration, not by this file.
 */
export function getModelOptions(_fastMode = false): ModelOption[] {
  const options: ModelOption[] = [getDefaultOption()]
  const seen = new Set<string>()

  // The four role slots. Selecting one pins its current model as the main
  // loop model; the role description doubles as the user-facing hint.
  for (const slot of MODEL_SLOTS) {
    const model = getSlotResolvedModel(slot.id) ?? getDefaultMainLoopModel()
    if (seen.has(model)) continue
    seen.add(model)
    const def = getSlotDefinition(slot.id)
    options.push({
      value: model,
      label: `${def.name} · ${def.label}`,
      description: `${def.description}（当前 ${model}）`,
      descriptionForModel: `${def.name} — ${def.description}`,
    })
  }

  // Models offered by the active provider (if any)
  const activeId = getActiveProviderId()
  const entry = activeId ? getProviderEntry(activeId) : undefined
  for (const model of entry?.models ?? []) {
    if (seen.has(model)) continue
    seen.add(model)
    options.push({
      value: model,
      label: model,
      description: entry?.name ?? 'provider model',
    })
  }

  // Env-injected custom model (kept for compatibility)
  const envCustomModel = process.env.ANTHROPIC_CUSTOM_MODEL_OPTION
  if (
    envCustomModel &&
    !options.some(existing => existing.value === envCustomModel)
  ) {
    seen.add(envCustomModel)
    options.push({
      value: envCustomModel,
      label: process.env.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME ?? envCustomModel,
      description:
        process.env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION ??
        `Custom model (${envCustomModel})`,
    })
  }

  // Options fetched during bootstrap (kept for compatibility)
  for (const opt of getGlobalConfig().additionalModelOptionsCache ?? []) {
    if (typeof opt?.value === 'string' && !seen.has(opt.value)) {
      seen.add(opt.value)
      options.push(opt)
    }
  }

  return withCurrentAndLegacyOptions(options, seen)
}

function getDefaultOption(): ModelOption {
  const artisan = getSlotResolvedModel('artisan') ?? getDefaultMainLoopModel()
  return {
    value: null,
    label: 'Default (recommended)',
    description: `主循环默认走 Artisan 槽（当前 ${artisan}）；plan 模式自动使用 Architect 槽`,
    descriptionForModel: 'Default model (Artisan slot; plan mode uses the Architect slot)',
  }
}

/** Append legacy/current-model options that are not already covered. */
function withCurrentAndLegacyOptions(
  options: ModelOption[],
  seen: Set<string>,
): ModelOption[] {
  // A user-pinned model that predates the slots (settings.model) stays
  // selectable even when no slot or provider lists it.
  const customCandidates: ModelSetting[] = []
  const currentModel = getUserSpecifiedModelSetting()
  if (currentModel !== undefined && currentModel !== null) {
    customCandidates.push(currentModel)
  }
  const initialMainLoopModel = getInitialMainLoopModel()
  if (initialMainLoopModel !== null) {
    customCandidates.push(initialMainLoopModel)
  }

  let out = options
  for (const candidate of customCandidates) {
    if (candidate === null || seen.has(candidate)) continue
    seen.add(candidate)
    if (candidate === 'opusplan') {
      // Legacy alias: plan mode used Opus, everything else Sonnet — which is
      // now the built-in default routing; kept selectable for old settings.
      out = [
        ...out,
        {
          value: candidate,
          label: 'Opus Plan Mode (legacy)',
          description: '旧版预设：plan 用 Opus、其余 Sonnet（现为默认路由的别名）',
        },
      ]
      continue
    }
    out = [...out, knownOrCustomOption(candidate)]
  }

  return filterModelOptionsByAllowlist(out)
}

const LEGACY_ALIAS_HINT: Record<string, string> = {
  opus: '旧别名 — 现解析为 Artisan 槽（长上下文编码）',
  sonnet: '旧别名 — 现解析为 Seer 槽（多模态日常）',
  haiku: '旧别名 — 现解析为 Clerk 槽（轻量文书）',
  best: '旧别名 — 现解析为 Architect 槽（最强档）',
}

function knownOrCustomOption(model: string): ModelOption {
  const marketingName = getMarketingNameForModel(model)
  if (marketingName) {
    return { value: model, label: marketingName, description: model }
  }
  const aliasHint = LEGACY_ALIAS_HINT[model]
  if (aliasHint) {
    return { value: model, label: model, description: aliasHint }
  }
  const canonical = getCanonicalName(model)
  if (canonical !== model) {
    return { value: model, label: model, description: `${model} → ${canonical}` }
  }
  return { value: model, label: model, description: 'Custom model' }
}

/**
 * Filter model options by the availableModels allowlist.
 * Always preserves the "Default" option (value: null).
 */
function filterModelOptionsByAllowlist(options: ModelOption[]): ModelOption[] {
  const settings = getSettings_DEPRECATED() || {}
  if (!settings.availableModels) {
    return options // No restrictions
  }
  return options.filter(
    opt =>
      opt.value === null || (opt.value !== null && isModelAllowed(opt.value)),
  )
}
