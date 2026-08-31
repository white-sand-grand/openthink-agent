import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getOpenThinkConfigHomeDir } from '../envUtils.js'
import { logForDebugging } from '../debug.js'

/**
 * Local secret store for third-party API provider keys.
 *
 * Keys intentionally do NOT live in settings.json: settings can be surfaced
 * by /config, shared between projects, or synced by tooling. Following
 * opencode's auth.json pattern, keys live in their own file under the config
 * home, created with 0600 permissions, and are never written anywhere else.
 */

let cache: Record<string, string> | undefined

function keysFilePath(): string {
  return join(getOpenThinkConfigHomeDir(), 'provider-keys.json')
}

/** Public path helper — the UI shows it so users know where keys live. */
export function providerKeysPath(): string {
  return keysFilePath()
}

function load(): Record<string, string> {
  if (cache) return cache
  const path = keysFilePath()
  try {
    if (existsSync(path)) {
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const out: Record<string, string> = Object.create(null) as Record<string, string>
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') out[k] = v
        }
        cache = out
        return out
      }
    }
  } catch (error) {
    logForDebugging(
      `[provider-keys] failed to read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  cache = {}
  return cache
}

function persist(data: Record<string, string>): void {
  const path = keysFilePath()
  try {
    const dir = path.slice(0, path.lastIndexOf(join(path, '..').length))
    void dir
    mkdirSync(getOpenThinkConfigHomeDir(), { recursive: true })
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
    try {
      chmodSync(path, 0o600)
    } catch {
      // Windows filesystems may not support chmod — best effort.
    }
    cache = data
  } catch (error) {
    logForDebugging(
      `[provider-keys] failed to write ${path}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export function getProviderKey(providerId: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(load(), providerId)
    ? load()[providerId]
    : undefined
}

export function setProviderKey(providerId: string, apiKey: string): void {
  if (!providerId || providerId === '__proto__' || providerId === 'prototype' || providerId === 'constructor') {
    throw new Error('Invalid provider ID')
  }
  // Header-injection guard: the key ends up in Authorization/x-api-key
  // headers, so reject anything with control characters or line breaks.
  if (/[\x00-\x1F\x7F]/.test(apiKey)) {
    throw new Error('Invalid API key: control characters are not allowed')
  }
  const data = load()
  if (apiKey) {
    data[providerId] = apiKey
  } else {
    delete data[providerId]
  }
  persist(data)
}

export function deleteProviderKey(providerId: string): void {
  const data = load()
  if (providerId in data) {
    delete data[providerId]
    persist(data)
  }
}

/** Mask a key for display: keep a short prefix/suffix so users can tell keys apart. */
export function maskKey(key: string): string {
  if (key.length <= 10) return '•'.repeat(key.length)
  return `${key.slice(0, 6)}…${key.slice(-4)}`
}
