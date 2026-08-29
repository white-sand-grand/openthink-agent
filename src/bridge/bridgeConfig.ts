// Stub files for deleted modules - replaced with no-op implementations
// for files that still reference them.

// ============================================================================
// src/bridge/bridgeConfig.ts
// ============================================================================

export function getBridgeConfig() {
  return {
    enabled: false,
    port: 0,
    host: '',
  }
}
