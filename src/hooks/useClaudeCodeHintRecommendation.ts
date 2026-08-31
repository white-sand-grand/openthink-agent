/**
 * Plugin hint recommendation hook.
 *
 * The restored build does not ship the interactive plugin-hint surface. Keep
 * the REPL contract intact while ensuring shell hint metadata cannot block
 * startup or render an incomplete dialog.
 */
export type ClaudeCodeHintRecommendationState = null

export function useClaudeCodeHintRecommendation(): {
  recommendation: ClaudeCodeHintRecommendationState
  handleResponse: (_response: 'yes' | 'no' | 'never' | 'disable') => void
} {
  return {
    recommendation: null,
    handleResponse: () => {},
  }
}
