// Stub: Claude AI limits service - removed in pure API mode
export const statusListeners = new Set<(limits: ClaudeAILimits) => void>()

export function getClaudeAILimits() {
  return {
    maxTokensPerMinute: Infinity,
    maxRequestsPerMinute: Infinity,
    isLimited: false,
  }
}

export function getRateLimitErrorMessage(limits: unknown, model: string): string | null {
  return null
}

export function getRateLimitWarning(
  _limits: unknown,
  _model: string,
): string | null {
  return null
}

export function getUsingOverageText(_limits: unknown): string {
  return ''
}

export function currentLimits() {
  return null
}

/** API-only builds do not receive claude.ai usage windows. */
export function getRawUtilization(): {
  five_hour?: { utilization: number; resets_at: string }
  seven_day?: { utilization: number; resets_at: string }
} {
  return {}
}

export function extractQuotaStatusFromError() {
  return null
}

export function extractQuotaStatusFromHeaders() {
  return null
}

export function checkQuotaStatus() {
  return Promise.resolve(null)
}

/** @deprecated Claude AI limits removed in API-only mode */
export class ClaudeAILimits {
  status = 'allowed' as const
  resetsAt?: number
  rateLimitType?: string
  utilization?: number
  getRemaining() {
    return Infinity
  }
  deduct() {}
}
