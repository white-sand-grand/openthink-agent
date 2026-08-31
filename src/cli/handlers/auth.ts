import {
  getAnthropicApiKeyWithSource,
  getAuthTokenSource,
} from '../../utils/apiKey.js'

/**
 * API-only restoration: Claude.ai OAuth is intentionally unavailable.
 * Keep the handler surface so the shared CLI can load in print mode.
 */
export async function installOAuthTokens(_tokens: unknown): Promise<void> {
  // OAuth token persistence is not supported in API-only builds.
}

export async function authLogin(): Promise<void> {
  process.stderr.write(
    'Claude.ai login is unavailable in API-only mode. Set ANTHROPIC_API_KEY instead.\n',
  )
  process.exitCode = 1
}

export async function authStatus(options: { json?: boolean; text?: boolean } = {}): Promise<void> {
  const { key, source } = getAnthropicApiKeyWithSource()
  if (options.text) {
    process.stdout.write(`${key ? 'API key configured' : 'No API key configured'} (${source})\n`)
    return
  }
  process.stdout.write(
    JSON.stringify({
      authenticated: Boolean(key),
      source: getAuthTokenSource(),
    }) + '\n',
  )
}

export async function authLogout(): Promise<void> {
  process.stderr.write(
    'Claude.ai logout is unavailable in API-only mode. Remove ANTHROPIC_API_KEY from the environment to disable API access.\n',
  )
}
