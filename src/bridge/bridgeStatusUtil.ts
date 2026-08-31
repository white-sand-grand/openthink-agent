import { getClaudeAiBaseUrl } from '../constants/product.js'

/** Build the URL users open in Claude.ai to attach to a bridge environment. */
export function buildBridgeConnectUrl(
  environmentId: string,
  sessionIngressUrl?: string,
): string {
  const baseUrl = getClaudeAiBaseUrl(environmentId, sessionIngressUrl)
  return `${baseUrl}/new?bridge=${encodeURIComponent(environmentId)}`
}

export function getBridgeStatus() {
  return 'disconnected'
}

export function buildActiveFooterText() {
  return ''
}

export function buildIdleFooterText() {
  return ''
}

export const FAILED_FOOTER_TEXT = ''

export function computeGlimmerIndex() {
  return 0
}

export function computeShimmerSegments() {
  return []
}

export const SHIMMER_INTERVAL_MS = 0
