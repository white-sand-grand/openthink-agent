import {
  getSettingsForSource,
  updateSettingsForSource,
} from '../settings/settings.js'
import type { SettingsJson } from '../settings/types.js'
import { applyConfigEnvironmentVariables } from '../managedEnv.js'
import { logForDebugging } from '../debug.js'
import {
  deleteProviderKey,
  getProviderKey,
  setProviderKey,
} from './providerKeys.js'

/**
 * Generic third-party provider store — cc-switch style.
 *
 * A provider is fully user-defined: base URL, protocol (Anthropic or OpenAI
 * wire format, "auto" = detect), and a user-managed model list. Nothing about
 * models is hardcoded; the built-in templates below are ONLY name + endpoint
 * conveniences (cc-switch's preset table), and every model must be added by
 * the user — typed in, or fetched from the endpoint's /v1/models.
 *
 * Storage follows the SSOT + separate-secrets pattern:
 * - non-secret metadata -> userSettings (`apiProviders`, `apiProvider`)
 * - API keys            -> providerKeys.ts (dedicated 0600 local file)
 * - active provider     -> mirrored into userSettings.env so the switch
 *   survives restarts and applies to process.env immediately.
 */

export type ProviderProtocol = 'anthropic' | 'openai'

export type ProviderEntry = {
  name: string
  baseUrl: string
  /** 'auto' resolves on first use and is persisted back as the resolved value. */
  protocol: ProviderProtocol | 'auto'
  /** User-managed model IDs. Deliberately not seeded from anywhere. */
  models: string[]
  websiteUrl?: string
  notes?: string
  createdAt?: number
  /** Resolved from 'auto' by detectProviderProtocol, then persisted. */
  detectedProtocol?: ProviderProtocol
  /** Template marker (templates carry no models and are not "real" until customized). */
  template?: boolean
}

/**
 * Built-in templates: endpoint conveniences only — NO model lists. Users add
 * models themselves (type them in or fetch from /v1/models).
 */
export const PROVIDER_TEMPLATES: Array<{
  id: string
  name: string
  baseUrl: string
  websiteUrl?: string
  notes?: string
}> = [
  {
    id: 'glm',
    name: '智谱 GLM (bigmodel.cn)',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    websiteUrl: 'https://open.bigmodel.cn',
    notes: '国内直连,Anthropic 兼容端点',
  },
  {
    id: 'glm-zai',
    name: 'Z.ai GLM (international)',
    baseUrl: 'https://api.z.ai/api/anthropic',
    websiteUrl: 'https://z.ai',
  },
  {
    id: 'kimi',
    name: 'Kimi (platform.moonshot.cn)',
    baseUrl: 'https://api.moonshot.cn/anthropic',
    websiteUrl: 'https://platform.moonshot.cn',
  },
  {
    id: 'kimi-global',
    name: 'Kimi (platform.moonshot.ai)',
    baseUrl: 'https://api.moonshot.ai/anthropic',
    websiteUrl: 'https://platform.moonshot.ai',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/anthropic',
    websiteUrl: 'https://platform.deepseek.com',
    notes: '官方 Anthropic 兼容端点',
  },
  {
    id: 'qwen',
    name: 'Qwen · 阿里云百炼 Coding',
    baseUrl: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
    websiteUrl: 'https://bailian.console.aliyun.com',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    websiteUrl: 'https://openrouter.ai',
    notes: 'OpenAI 协议聚合网关',
  },
  {
    id: 'siliconflow',
    name: '硅基流动 SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    websiteUrl: 'https://siliconflow.cn',
    notes: 'OpenAI 协议聚合平台',
  },
]

/** Env keys the provider switcher owns (mirrored from settings.env). */
const PROVIDER_ENV_KEYS = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
] as const

export type ProviderRegistry = Record<string, ProviderEntry>

function isSafeProviderId(id: string): boolean {
  return Boolean(id) && id !== '__proto__' && id !== 'prototype' && id !== 'constructor'
}

function readRegistry(): { registry: ProviderRegistry; activeId: string | null } {
  const user = getSettingsForSource('userSettings')
  const registry: ProviderRegistry = Object.create(null) as ProviderRegistry
  const raw = user?.apiProviders ?? {}
  for (const [id, entry] of Object.entries(raw)) {
    if (!isSafeProviderId(id)) continue
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    // Legacy entries from the first cut stored {apiKey} inside settings —
    // surface them as base entries so the key can migrate to the key store.
    registry[id] = {
      name: typeof e.name === 'string' ? e.name : id,
      baseUrl: typeof e.baseUrl === 'string' ? e.baseUrl : '',
      protocol:
        e.protocol === 'openai' || e.protocol === 'anthropic'
          ? e.protocol
          : 'auto',
      models: Array.isArray(e.models)
        ? e.models.filter((m): m is string => typeof m === 'string')
        : [],
      websiteUrl: typeof e.websiteUrl === 'string' ? e.websiteUrl : undefined,
      notes: typeof e.notes === 'string' ? e.notes : undefined,
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : undefined,
      detectedProtocol:
        e.detectedProtocol === 'openai' || e.detectedProtocol === 'anthropic'
          ? e.detectedProtocol
          : undefined,
      template: e.template === true,
    }
    // One-time migration: legacy key stored in settings moves to the
    // dedicated key file and is stripped from settings on next write.
    if (typeof e.apiKey === 'string' && e.apiKey) {
      if (!getProviderKey(id)) setProviderKey(id, e.apiKey)
    }
  }
  return { registry, activeId: user?.apiProvider ?? null }
}

function writeRegistryPatch(patch: {
  apiProvider?: string | undefined
  apiProviders?: ProviderRegistry | undefined
  env?: Record<string, string | undefined>
  model?: string | undefined
}): void {
  updateSettingsForSource('userSettings', patch as unknown as SettingsJson)
  applyConfigEnvironmentVariables()
}

export function listProviders(): Array<{ id: string; entry: ProviderEntry; active: boolean; hasKey: boolean }> {
  const { registry, activeId } = readRegistry()
  return Object.entries(registry)
    .map(([id, entry]) => ({
      id,
      entry,
      active: activeId === id,
      hasKey: Boolean(getProviderKey(id)),
    }))
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return (a.entry.createdAt ?? 0) - (b.entry.createdAt ?? 0)
    })
}

export function getProviderEntry(id: string): ProviderEntry | undefined {
  return readRegistry().registry[id]
}

export function isProviderActive(id: string): boolean {
  return readRegistry().activeId === id
}

export function getActiveProviderId(): string | null {
  return readRegistry().activeId
}

export function upsertProvider(
  id: string,
  entry: ProviderEntry,
  apiKey?: string,
): void {
  if (!isSafeProviderId(id)) throw new Error('Invalid provider ID')
  const { registry } = readRegistry()
  const next: ProviderRegistry = { ...registry, [id]: entry }
  if (apiKey !== undefined) setProviderKey(id, apiKey)
  writeRegistryPatch({ apiProviders: next })
}

export function deleteProvider(id: string): void {
  const { registry, activeId } = readRegistry()
  const next: ProviderRegistry = { ...registry }
  delete next[id]
  deleteProviderKey(id)
  if (activeId === id) {
    deactivateProvider()
    writeRegistryPatch({ apiProviders: next })
  } else {
    writeRegistryPatch({ apiProviders: next })
  }
}

/** Resolve entry.protocol === 'auto' by probing the endpoint; persists result. */
export async function resolveProviderProtocol(
  id: string,
): Promise<ProviderProtocol | null> {
  const entry = getProviderEntry(id)
  if (!entry) return null
  if (entry.protocol !== 'auto') return entry.protocol
  if (entry.detectedProtocol) return entry.detectedProtocol
  const key = getProviderKey(id) ?? ''
  const detected = await detectProviderProtocol(entry.baseUrl, key)
  if (detected) {
    const fresh = getProviderEntry(id)
    if (fresh) {
      upsertProvider(id, { ...fresh, detectedProtocol: detected })
    }
  }
  return detected
}

/**
 * Effective override for the API client, or null when using the default
 * Anthropic endpoint. Protocol 'auto' that never resolved falls back to
 * 'anthropic' (the app's native wire format).
 */
export function getActiveProviderOverride(): {
  id: string
  entry: ProviderEntry
  baseUrl: string
  apiKey: string
  protocol: ProviderProtocol
} | null {
  const { activeId } = readRegistry()
  if (!activeId) return null
  const entry = getProviderEntry(activeId)
  if (!entry) return null
  const baseUrl = entry.baseUrl
  const apiKey = getProviderKey(activeId) ?? ''
  if (!baseUrl || !apiKey) return null
  const protocol: ProviderProtocol =
    entry.protocol === 'openai' || entry.protocol === 'anthropic'
      ? entry.protocol
      : entry.detectedProtocol ?? 'anthropic'
  return { id: activeId, entry, baseUrl, apiKey, protocol }
}

function mirrorProviderEnv(id: string): void {
  const entry = getProviderEntry(id)
  const key = getProviderKey(id) ?? ''
  if (!entry || !key) return
  // Background/utility calls use the first user-added model — no hardcoded
  // default. With no models configured, skip the small-fast keys: the main
  // loop still works, background callers fall back and degrade gracefully.
  const utilityModel = entry.models[0]
  writeRegistryPatch({
    env: {
      ANTHROPIC_BASE_URL: entry.baseUrl,
      ANTHROPIC_AUTH_TOKEN: key,
      ANTHROPIC_API_KEY: key,
      ...(utilityModel
        ? {
            ANTHROPIC_SMALL_FAST_MODEL: utilityModel,
            ANTHROPIC_DEFAULT_HAIKU_MODEL: utilityModel,
          }
        : {}),
    },
  })
  // Mirror into process.env so the change is live without waiting for the
  // settings->state round trip.
  process.env.ANTHROPIC_BASE_URL = entry.baseUrl
  process.env.ANTHROPIC_AUTH_TOKEN = key
  process.env.ANTHROPIC_API_KEY = key
  if (utilityModel) {
    process.env.ANTHROPIC_SMALL_FAST_MODEL = utilityModel
    process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = utilityModel
  }
}

/** Activate a stored provider for the running session and future sessions. */
export function activateProvider(id: string): void {
  const entry = getProviderEntry(id)
  if (!entry) return
  const { registry } = readRegistry()
  mirrorProviderEnv(id)
  // A settings.model from another provider would 404 here; drop it. The
  // picker immediately follows up with a fresh selection.
  const currentModel = getSettingsForSource('userSettings')?.model
  writeRegistryPatch({
    apiProvider: id,
    apiProviders: registry,
    ...(currentModel && !currentModel.startsWith('claude')
      ? { model: undefined }
      : {}),
  })
}

/** Deactivate: back to the default Anthropic endpoint. Keys stay stored. */
export function deactivateProvider(): void {
  writeRegistryPatch({
    apiProvider: undefined,
    env: Object.fromEntries(PROVIDER_ENV_KEYS.map(k => [k, undefined])),
  })
  for (const key of PROVIDER_ENV_KEYS) {
    delete process.env[key]
  }
}

// ---------------------------------------------------------------------------
// Endpoint probing (cc-switch services/model_fetch.rs pattern)
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 12_000

/**
 * Known "Anthropic-compatible" path suffixes. When a base URL ends with one,
 * the model-list probe also tries the stripped root (the root usually serves
 * the OpenAI-style /v1/models even when the chat endpoint is /anthropic).
 */
const COMPAT_SUFFIXES = [
  '/api/anthropic',
  '/apps/anthropic',
  '/anthropic',
] as const

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function stripCompatSuffix(url: string): string | null {
  const lower = stripTrailingSlash(url).toLowerCase()
  // Longest suffix first so /api/anthropic wins over /anthropic.
  const sorted = [...COMPAT_SUFFIXES].sort((a, b) => b.length - a.length)
  for (const suffix of sorted) {
    if (lower.endsWith(suffix)) {
      return stripTrailingSlash(url).slice(0, -suffix.length)
    }
  }
  return null
}

function authHeaders(
  apiKey: string,
  protocol: ProviderProtocol,
): Record<string, string> {
  if (protocol === 'anthropic') {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    }
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }
}

/** Remove anything that looks like the stored key from an error body. */
function redact(text: string, apiKey: string): string {
  let out = text
  if (apiKey) out = out.split(apiKey).join('<redacted>')
  return out.slice(0, 400)
}

async function timedFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Detect whether a base URL speaks the Anthropic or the OpenAI wire format.
 * Probe order: known Anthropic chat paths first, then OpenAI chat paths.
 * A 404 means "wrong path, keep probing"; any other response (200/4xx)
 * means the endpoint exists.
 */
export async function detectProviderProtocol(
  baseUrl: string,
  apiKey: string,
): Promise<ProviderProtocol | null> {
  const base = stripTrailingSlash(baseUrl)
  if (!base) return null
  const root = stripCompatSuffix(base)
  const probeUrlCandidates: Array<{ url: string; protocol: ProviderProtocol }> = [
    { url: `${base}/v1/messages`, protocol: 'anthropic' },
    ...(root ? [{ url: `${root}/v1/messages`, protocol: 'anthropic' }] : []),
    { url: `${base}/chat/completions`, protocol: 'openai' },
    { url: `${base}/v1/chat/completions`, protocol: 'openai' },
    ...(root
      ? [{ url: `${root}/v1/chat/completions`, protocol: 'openai' }]
      : []),
  ]
  for (const candidate of probeUrlCandidates) {
    try {
      // Both wire formats accept {model, max_tokens, messages} for a minimal
      // probe; a wrong-model 400 still proves the path exists.
      const body = {
        model: 'probe',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }
      const res = await timedFetch(candidate.url, {
        method: 'POST',
        headers: authHeaders(apiKey, candidate.protocol),
        body: JSON.stringify(body),
      })
      // Drain body to release the socket.
      await res.text().catch(() => '')
      if (res.status === 404 || res.status === 405) continue
      return candidate.protocol
    } catch (error) {
      logForDebugging(
        `[provider] probe ${candidate.url} failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  return null
}

/**
 * Fetch the model list a provider exposes, via OpenAI-compatible
 * GET /v1/models (both major wire formats serve the same {data:[{id}]}
 * shape on their models endpoints). Candidate URLs follow cc-switch's
 * model_fetch: base + /v1/models, base + /models, compat-suffix-stripped
 * roots, and version-segment handling.
 */
export async function fetchProviderModels(
  baseUrl: string,
  apiKey: string,
  protocol: ProviderProtocol,
): Promise<{ models: string[]; error?: string }> {
  const base = stripTrailingSlash(baseUrl)
  if (!base) return { models: [], error: 'Base URL 为空' }
  const candidates: string[] = [`${base}/v1/models`, `${base}/models`]
  const root = stripCompatSuffix(base)
  if (root) {
    candidates.push(`${root}/v1/models`, `${root}/models`)
  }
  let lastError = ''
  for (const url of candidates) {
    try {
      const res = await timedFetch(url, {
        method: 'GET',
        headers: authHeaders(apiKey, protocol),
      })
      const text = await res.text()
      if (!res.ok) {
        lastError = `HTTP ${res.status} @ ${url}: ${redact(text, apiKey)}`
        continue
      }
      const parsed = JSON.parse(text) as {
        data?: Array<{ id?: string }>
        models?: Array<{ id?: string | { name?: string } }>
      }
      const ids: string[] = []
      const push = (id: unknown) => {
        if (typeof id === 'string' && id && !ids.includes(id)) ids.push(id)
      }
      if (Array.isArray(parsed.data)) {
        for (const m of parsed.data) push(m?.id)
      } else if (Array.isArray(parsed.models)) {
        // Google-style fallback
        for (const m of parsed.models) {
          if (typeof m === 'object' && m !== null) {
            push((m as { id?: string }).id ?? (m as { name?: string }).name)
          }
        }
      }
      if (ids.length > 0) return { models: ids }
      lastError = `响应中没有模型列表 @ ${url}: ${redact(text, apiKey)}`
    } catch (error) {
      lastError = `${error instanceof Error ? error.message : String(error)} @ ${url}`
    }
  }
  return { models: [], error: redact(lastError, apiKey) }
}

/** Stable id from a user-facing name (for user-added providers). */
export function slugifyProviderName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const { registry } = readRegistry()
  if (!slug || registry[slug]) {
    return `${slug || 'provider'}-${Date.now().toString(36)}`
  }
  return slug
}
