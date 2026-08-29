// Stub: Claude AI limits service - removed in pure API mode
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

export function currentLimits() {
  return null
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
  getRemaining() {
    return Infinity
  }
  deduct() {}
}
