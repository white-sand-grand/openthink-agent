/**
 * Simplified API Key management for pure API access mode.
 *
 * Provides:
 *  - ANTHROPIC_API_KEY environment variable
 *  - apiKeyHelper command (from settings or project config)
 *  - Settings and global config helpers
 *  - Trust dialog checks
 *  - AWS/GCP credential helpers (passthrough stubs for Bedrock/Vertex)
 */

// ============================================================================
// API Key from environment variable
// ============================================================================

const ANTHROPIC_API_KEY = 'ANTHROPIC_API_KEY'
const DEFAULT_API_KEY_HELPER = 'echo $ANTHROPIC_API_KEY'

export function getApiKey(): string | null {
  if (process.env[ANTHROPIC_API_KEY]) {
    return process.env[ANTHROPIC_API_KEY]
  }

  const helper = getConfiguredApiKeyHelper()
  if (helper) {
    return getApiKeyFromApiKeyHelper(helper)
  }

  return null
}

export function getApiKeyOrThrow(): string {
  const key = getApiKey()
  if (!key) {
    throw new Error(
      `No API key configured. Set the ${ANTHROPIC_API_KEY} environment variable or use the apiKeyHelper setting.`
    )
  }
  return key
}

export async function getApiKeyAsync(): Promise<string | null> {
  if (process.env[ANTHROPIC_API_KEY]) {
    return process.env[ANTHROPIC_API_KEY]
  }

  const helper = getConfiguredApiKeyHelper()
  if (helper) {
    return prefetchApiKeyFromApiKeyHelperIfSafe(helper)
  }

  return null
}

// ============================================================================
// API Key Helper
// ============================================================================

/** @internal Cache for apiKeyHelper results */
let _apiKeyHelperCache: { result: string; timestamp: number } | null = null
let _apiKeyHelperCacheTTL = 30_000 // 30 seconds

export function getConfiguredApiKeyHelper(): string | null {
  // Check environment variable first
  const env = process.env.ANTHROPIC_API_KEY_HELPER
  if (env !== undefined) {
    return env || null
  }

  // Check global config
  const globalConfig = getGlobalConfig()
  if (globalConfig && globalConfig.apiKeyHelper) {
    return globalConfig.apiKeyHelper
  }

  return null
}

export async function getApiKeyFromApiKeyHelper(command?: string): Promise<string | null> {
  const helper = command ?? getConfiguredApiKeyHelper()
  if (!helper) {
    return null
  }

  // Empty helper means no API key
  if (!helper.trim()) {
    return null
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execa } = await import('execa')
    const result = await execa(helper, { shell: true, encoding: 'utf8' })
    const key = result.stdout.trim()
    if (key) {
      _apiKeyHelperCache = { result: key, timestamp: Date.now() }
    }
    return key || null
  } catch {
    return null
  }
}

export function getApiKeyFromApiKeyHelperCached(): string | null {
  if (_apiKeyHelperCache) {
    const elapsed = Date.now() - _apiKeyHelperCache.timestamp
    if (elapsed < _apiKeyHelperCacheTTL) {
      return _apiKeyHelperCache.result
    }
  }
  return null
}

export function clearApiKeyHelperCache(): void {
  _apiKeyHelperCache = null
}

export function getApiKeyHelperElapsedMs(): number | null {
  if (!_apiKeyHelperCache) return null
  return Date.now() - _apiKeyHelperCache.timestamp
}

export async function prefetchApiKeyFromApiKeyHelperIfSafe(): Promise<string | null>
export async function prefetchApiKeyFromApiKeyHelperIfSafe(command: string): Promise<string | null>
export async function prefetchApiKeyFromApiKeyHelperIfSafe(command?: string): Promise<string | null> {
  const helper = command ?? getConfiguredApiKeyHelper()
  if (!helper) {
    return null
  }
  return getApiKeyFromApiKeyHelper(helper)
}

// ============================================================================
// Config normalization
// ============================================================================

/** @internal Max length for stored API keys */
const MAX_API_KEY_LENGTH = 256

export function normalizeApiKeyForConfig(key: string | null | undefined): string | undefined {
  if (key == null || typeof key !== 'string') {
    return undefined
  }
  const trimmed = key.trim()
  if (!trimmed || trimmed.length > MAX_API_KEY_LENGTH) {
    return undefined
  }
  // Basic sanitization: remove whitespace and control chars
  return trimmed.replace(/[\x00-\x1f\x7f]/g, '')
}

// ============================================================================
// Settings
// ============================================================================

import { getInitialSettings } from '../utils/settings/settings.js'

export function getSettings_DEPRECATED(): any {
  return getInitialSettings()
}

export function getSettingsForSource(source: string, product: string): any {
  return getInitialSettings()
}

// ============================================================================
// Global Config
// ============================================================================

export interface GlobalConfig {
  apiKeyHelper?: string
  theme?: string
  vimMode?: boolean
  fontSize?: number
  autoUpdaterStatus?: string
  trustDialogAccepted?: boolean
  bareMode?: boolean
  [key: string]: unknown
}

let _cachedGlobalConfig: GlobalConfig | null = null

export function getGlobalConfig(): GlobalConfig | null {
  if (_cachedGlobalConfig !== null) {
    return _cachedGlobalConfig
  }

  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    const configPath = `${homeDir}/.openthink/.openthink.json`

    // eslint-disable-next-line node/fs-require-promise
    const fs = require('node:fs')
    const content = fs.readFileSync(configPath, 'utf8')
    const data = JSON.parse(content)
    _cachedGlobalConfig = data
    return data
  } catch {
    return null
  }
}

export function saveGlobalConfig(config: GlobalConfig): void {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    const configPath = `${homeDir}/.openthink/.openthink.json`
    // eslint-disable-next-line node/fs-require-promise
    const fs = require('node:fs')
    fs.mkdirSync(`${homeDir}/.openthink`, { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
    _cachedGlobalConfig = config
  } catch {
    // ignore
  }
}

// ============================================================================
// Trust Dialog
// ============================================================================

export function checkHasTrustDialogAccepted(): boolean {
  const config = getGlobalConfig()
  return config?.trustDialogAccepted === true
}

export function setTrustDialogAccepted(accepted: boolean): void {
  const config = getGlobalConfig() ?? {}
  config.trustDialogAccepted = accepted
  saveGlobalConfig(config)
}

// ============================================================================
// Bare mode
// ============================================================================

export function isBareMode(): boolean {
  const config = getGlobalConfig()
  return config?.bareMode === true
}

// ============================================================================
// Theme / Font size helpers
// ============================================================================

export function getTheme(): string {
  const config = getGlobalConfig()
  return config?.theme || 'dark'
}

export function getFontSize(): number {
  const config = getGlobalConfig()
  return config?.fontSize || 14
}

export function isVimEnabled(): boolean {
  const config = getGlobalConfig()
  return config?.vimMode === true
}

// ============================================================================
// macOS Keychain (optional, only used in original for credential storage)
// ============================================================================

export async function maybeRemoveApiKeyFromMacOSKeychainThrows(): Promise<void> {
  // No-op in API-only mode. Original stored OAuth tokens in keychain.
}

// ============================================================================
// Third-party service support (Bedrock / Vertex / Foundry)
// ============================================================================

/**
 * Prefetch AWS credentials for Bedrock if configured.
 */
export async function prefetchAwsCredentialsAndBedRockInfoIfSafe(): Promise<void> {
  const settings = getSettings_DEPRECATED()
  if (!settings?.awsProfile) {
    return
  }
  // AWS credentials are resolved lazily by the SDK
}

export function clearAwsCredentialsCache(): void {
  // no-op in API-only mode
}

/**
 * Get AWS credentials for Bedrock.
 */
export async function refreshAndGetAwsCredentials(): Promise<
  | { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
  | undefined
> {
  return undefined
}

/**
 * Prefetch GCP credentials for Vertex if configured.
 */
export async function prefetchGcpCredentialsIfSafe(): Promise<void> {
  const settings = getSettings_DEPRECATED()
  if (!settings?.gcpProject) {
    return
  }
  // GCP credentials are resolved lazily by the SDK
}

export function clearGcpCredentialsCache(): void {
  // no-op in API-only mode
}

/**
 * Refresh GCP credentials.
 */
export async function refreshGcpCredentialsIfNeeded(): Promise<string | null> {
  return null
}

// ============================================================================
// OAuth / Account stubs (removed in pure API mode)
// ============================================================================

export type OAuthTokenInfo = null
export type OAuthTokens = null

export async function getClaudeAIOAuthTokens(): Promise<OAuthTokens> {
  return null
}

export async function checkAndRefreshOAuthTokenIfNeeded(): Promise<boolean> {
  return false
}

export function getOauthAccountInfo(): { email: string } | null {
  return null
}

export function isClaudeAISubscriber(): boolean {
  return false
}

export function getSubscriptionType(): string | null {
  return null
}

export function isProSubscriber(): boolean {
  return false
}

export function isMaxSubscriber(): boolean {
  return false
}

export function isEnterpriseSubscriber(): boolean {
  return false
}

export function is1PApiCustomer(): boolean {
  return false
}

export function validateForceLoginOrg(): boolean {
  return false
}

export function isOverageProvisioningAllowed(): boolean {
  return false
}

export function isConsumerSubscriber(): boolean {
  return false
}

export function isTeamSubscriber(): boolean {
  return false
}

export function isTeamPremiumSubscriber(): boolean {
  return false
}

export function isAnthropicAuthEnabled(): boolean {
  return false
}

export function getClaudeMaxModel(): string | null {
  return null
}

export async function handleOAuth401Error(): Promise<boolean> {
  return false
}

export function hasProfileScope(): boolean {
  return false
}

export function getAuthTokenSource(): string {
  if (process.env.ANTHROPIC_API_KEY) {
    return 'ANTHROPIC_API_KEY'
  }
  return 'none'
}

export function getApiKeyFromConfigOrMacOSKeychain(): string | null {
  return getApiKey()
}

export function getRateLimitTier(): string {
  return 'free'
}

export function getAnthropicApiKey(): string | null {
  return getApiKey()
}

export function getAnthropicApiKeyWithSource(): { key: string | null; source: string } {
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey) {
    return { key: envKey, source: 'ANTHROPIC_API_KEY' }
  }
  return { key: null, source: 'none' }
}
