// Stub: Bridge messaging
/**
 * Small bounded set used to de-duplicate remote-session message echoes.
 * The full bridge is unavailable in API-only builds, but this local data
 * structure is still required by the REPL's remote-session hook.
 */
export class BoundedUUIDSet {
  private readonly values = new Set<string>()
  private readonly order: string[] = []

  constructor(maxSize: number) {
    // Keep the eviction loop total even if a caller supplies invalid input.
    this.maxSize = Number.isFinite(maxSize) ? Math.max(1, Math.floor(maxSize)) : 1
  }

  private readonly maxSize: number

  has(value: string): boolean {
    return this.values.has(value)
  }

  add(value: string): void {
    if (this.values.has(value)) return
    this.values.add(value)
    this.order.push(value)
    while (this.order.length > this.maxSize) {
      const oldest = this.order.shift()
      if (oldest !== undefined) this.values.delete(oldest)
    }
  }
}

export function sendBridgeMessage() {
  // no-op
}

export function onBridgeMessage() {
  return () => {}
}
