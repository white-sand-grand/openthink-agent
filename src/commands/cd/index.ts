import type { Command } from '../../commands.js'

const cd = {
  type: 'local',
  name: 'cd',
  description: 'Change the working directory for this session',
  supportsNonInteractive: false,
  load: () => import('./cd.js'),
} satisfies Command

export default cd
