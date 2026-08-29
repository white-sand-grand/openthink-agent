// Stub: Auth file descriptor - OAuth removed in API-only mode

export type AuthFileDescriptor = {
  fd: number
  encoding: string
}

export function createAuthFileDescriptor() {
  return null
}

export function readAuthFileDescriptor() {
  return null
}

export const CCR_SESSION_INGRESS_TOKEN_PATH = ''

export function readTokenFromWellKnownFile() {
  return null
}

export function maybePersistTokenForSubprocesses() {
  // no-op in API-only mode
}
