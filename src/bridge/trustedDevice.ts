/**
 * API-only compatibility shim for the optional trusted-device flow.
 * Remote device enrollment is not part of this build, but main.tsx keeps the
 * dynamic call so the same startup path can be shared with hosted builds.
 */
export function clearTrustedDeviceToken(): void {
  // Intentionally empty: there is no local trusted-device token in API-only mode.
}

export async function enrollTrustedDevice(): Promise<void> {
  // Intentionally empty: remote device enrollment is not available locally.
}
