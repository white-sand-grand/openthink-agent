/**
 * TUI command - minimal metadata only.
 * Implementation is lazy-loaded from tui.tsx to reduce startup time.
 */
import type { Command } from '../../commands.js'

const tui = {
  type: 'local-jsx',
  name: 'tui',
  description:
    'Switch between the fullscreen and classic terminal renderers (upstream 2.1.110)',
  argumentHint: '[fullscreen|classic]',
  immediate: true,
  load: () => import('./tui.js'),
} satisfies Command

export default tui
