/**
 * Provider command - minimal metadata only.
 * Implementation is lazy-loaded from provider.tsx to reduce startup time.
 */
import type { Command } from '../../commands.js'

const provider = {
  aliases: ['provide'],
  type: 'local-jsx',
  name: 'provider',
  description:
    'Switch API provider (GLM · Kimi · DeepSeek · Qwen · custom) and pick models',
  immediate: true,
  load: () => import('./provider.js'),
} satisfies Command

export default provider
