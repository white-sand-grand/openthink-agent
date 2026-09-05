import type { Command } from '../../commands.js'

const rewind = {
  description: `Restore the conversation to a previous point — after /clear, offers the cleared conversation back (upstream 2.1.191)`,
  name: 'rewind',
  aliases: ['checkpoint'],
  argumentHint: '',
  type: 'local-jsx',
  supportsNonInteractive: false,
  load: () => import('./rewind.js'),
} satisfies Command

export default rewind
