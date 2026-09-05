/**
 * Model command - minimal metadata only.
 * Implementation is lazy-loaded from model.tsx to reduce startup time.
 */
import type { Command } from '../../commands.js'
import { shouldInferenceConfigCommandBeImmediate } from '../../utils/immediateCommand.js'

const model = {
  type: 'local-jsx',
  name: 'model',
  description: 'Set the main loop model (default = Artisan slot; plan mode uses Architect)',
  argumentHint: '[model]',
  get immediate() {
    return shouldInferenceConfigCommandBeImmediate()
  },
  load: () => import('./model.js'),
} satisfies Command

export default model
