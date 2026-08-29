import type { ModelSetting } from './model.js'

/**
 * Fast mode has been removed.
 *
 * It was an Anthropic usage-credits billing feature hard-bound to a specific
 * Opus model — meaningless for a pure-API, any-provider build. The exports
 * below remain as inert stubs with unchanged signatures so the dormant call
 * sites across the codebase keep working: `isFastModeEnabled()` is
 * permanently false, which turns every fast-mode code path off.
 */

export const FAST_MODE_MODEL_DISPLAY = ''

export function isFastModeEnabled(): boolean {
  return false
}

export function isFastModeAvailable(): boolean {
  return false
}

export function isFastModeCooldown(): boolean {
  return false
}

export function getFastModeUnavailableReason(): string | null {
  return 'Fast mode has been removed'
}

export function getFastModeModel(): string {
  return ''
}

export function getInitialFastModeSetting(_model: ModelSetting): boolean {
  return false
}

export function isFastModeSupportedByModel(_model: ModelSetting): boolean {
  return false
}

// operational state: whether we're actively sending fast speed or in cooldown
// after a rate limit. Always "active" (i.e. idle) now that fast mode is gone.
export type FastModeRuntimeState =
  | { status: 'active' }
  | { status: 'cooldown'; resetAt: number; reason: CooldownReason }

export type CooldownReason = 'rate_limit' | 'overloaded'

type Subscribe1 = (listener: (resetAt: number, reason: CooldownReason) => void) => () => void
type Subscribe0 = (listener: () => void) => () => void

export const onCooldownTriggered: Subscribe1 = () => () => {}
export const onCooldownExpired: Subscribe0 = () => () => {}

export function getFastModeRuntimeState(): FastModeRuntimeState {
  return { status: 'active' }
}

export function triggerFastModeCooldown(
  _resetTimestamp: number,
  _reason: CooldownReason,
): void {}

export function clearFastModeCooldown(): void {}

export function handleFastModeRejectedByAPI(): void {}

export const onFastModeOverageRejection: Subscribe0 = () => () => {}

export function handleFastModeOverageRejection(_reason: string | null): void {}

export function getFastModeState(
  _model: ModelSetting,
  _fastModeUserEnabled: boolean | undefined,
): 'off' | 'cooldown' | 'on' {
  return 'off'
}

// Disabled reason returned by the API.
export type FastModeDisabledReason =
  | 'free'
  | 'preference'
  | 'extra_usage_disabled'
  | 'network_error'
  | 'unknown'

export const onOrgFastModeChanged: Subscribe0 = () => () => {}

export function resolveFastModeStatusFromCache(): void {}

export async function prefetchFastModeStatus(): Promise<void> {}
