// Stub: authPortable utilities - replaced by apiKey.ts
export function normalizeApiKeyForConfig(key: string | null | undefined): string | undefined {
  if (!key || typeof key !== 'string') return undefined
  return key.trim().replace(/[\x00-\x1f\x7f]/g, '')
}

/** @deprecated Use apiKey.ts instead */
export async function maybeRemoveApiKeyFromMacOSKeychainThrows() {
  // no-op in API-only mode
}
