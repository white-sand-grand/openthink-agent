import type { Command } from '../../commands.js'

const config = {
  aliases: ['settings'],
  type: 'local-jsx',
  name: 'config',
  description: 'View and modify configuration',
  immediate: true,
  argumentHint: '<key>=<value> | --help',
  load: () => import('./config.js'),
} satisfies Command

export default config
