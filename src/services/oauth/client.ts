// Stub: OAuth client module (full OAuth was removed in pure API mode)
export class OAuthService {
  getAccessToken() {
    return null
  }
  cleanup() {}
  startOAuthFlow() {
    return Promise.reject(new Error('OAuth not supported in API-only mode'))
  }
}

export function isOAuthTokenExpired(): boolean {
  return false
}

export function getAccessToken(): string | null {
  return null
}

export async function refreshAccessToken() {
  return null
}

export function getOrganizationUUID(): string | null {
  return null
}

export function populateOAuthAccountInfoIfNeeded() {
  // no-op
}
