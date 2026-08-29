// Stub: Login command - removed in API-only mode
import type { Command } from '../../types/command.js'

export default {
  type: 'local-jsx',
  name: 'login',
  description: 'Login (not available in API-only mode)',
  isEnabled: () => false,
  call: async () => 'Login is not available in API-only mode. Use ANTHROPIC_API_KEY instead.',
} satisfies Command
