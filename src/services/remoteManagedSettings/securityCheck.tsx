// Stub: Remote managed settings security check - removed in API-only mode
import React from 'react'

export function checkManagedSettingsSecurity() {
  return { passed: true, errors: [] }
}

export function handleSecurityCheckResult(result: { passed: boolean; errors: string[] }) {
  if (!result.passed) {
    console.warn('Security check failed:', result.errors)
  }
}

export function SecurityCheck() {
  return null
}
