// Stub: Claude AI limits hook - removed in pure API mode
/** @deprecated Claude AI limits hook removed in API-only mode */
export const useClaudeAILimits = () => ({
  limits: null,
  isLimited: false,
  remaining: Infinity,
})

export const useClaudeAiLimits = useClaudeAILimits
