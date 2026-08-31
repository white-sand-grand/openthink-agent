// Stub: Internal event types removed in API-only mode
// Minimal protobuf-compatible shim for the API-only restored build. The
// analytics exporter calls toJSON() even when first-party event transport is
// unavailable; returning the plain object prevents a retry/error loop.
export const ClaudeCodeInternalEvent = {
  toJSON(value: unknown): unknown {
    return value
  },
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ClaudeCodeInternalEventV1: Record<string, never> = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EnvironmentMetadata: Record<string, never> = {}
