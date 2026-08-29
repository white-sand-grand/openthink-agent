// Stub: Extra usage command - removed in API-only mode
import type { Command } from '../../commands.js'

export const extraUsage = {
  type: 'local-noop' as const,
  name: 'extra-usage',
  description: 'Request extra usage (not available in API-only mode)',
  isEnabled: () => false,
} satisfies Command
