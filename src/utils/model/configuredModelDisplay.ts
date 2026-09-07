type Slots = Partial<Record<'architect' | 'artisan' | 'seer' | 'clerk', string>>

/** Whether the current selection has an actual configuration, without vendor defaults. */
export function hasConfiguredDisplayModel(
  selection: string | null | undefined,
  slots: Slots,
  env: Record<string, string | undefined>,
): boolean {
  const artisan = slots.artisan?.trim() || env.ANTHROPIC_DEFAULT_OPUS_MODEL?.trim()
  const seer = slots.seer?.trim() || env.ANTHROPIC_DEFAULT_SONNET_MODEL?.trim()
  const clerk = slots.clerk?.trim() || env.ANTHROPIC_DEFAULT_HAIKU_MODEL?.trim()
  const normalized = selection?.trim().toLowerCase().replace(/\[1m\]$/, '').trim()
  if (!normalized) {
    // Same default route as getDefaultMainLoopModelSetting in API-only mode.
    return Boolean(slots.artisan?.trim() || seer)
  }
  switch (normalized) {
    case 'opus': return Boolean(artisan)
    case 'sonnet':
    case 'opusplan': return Boolean(seer)
    case 'haiku': return Boolean(clerk)
    case 'best': return Boolean(slots.architect?.trim() || artisan)
    default: return true // Explicit custom/provider model ID.
  }
}
