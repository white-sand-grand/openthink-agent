import { existsSync, realpathSync } from 'fs'
import { resolve } from 'path'
import type { LocalCommandCall } from '../../types/command.js'
import { getCwd } from '../../utils/cwd.js'
import { setCwd } from '../../utils/Shell.js'
import { onCwdChangedForHooks } from '../../utils/hooks/fileChangedWatcher.js'

export const call: LocalCommandCall = async (args, _context) => {
  const requested = args.trim()
  if (!requested) return { type: 'text', value: `Current directory: ${getCwd()}` }
  const oldCwd = getCwd()
  const target = resolve(oldCwd, requested)
  if (!existsSync(target)) return { type: 'text', value: `Directory does not exist: ${target}` }
  let physical: string
  try {
    physical = realpathSync(target)
  } catch {
    return { type: 'text', value: `Unable to resolve directory: ${target}` }
  }
  if (!physical) return { type: 'text', value: `Directory does not exist: ${target}` }
  try {
    process.chdir(physical)
    setCwd(physical)
    await onCwdChangedForHooks(oldCwd, physical)
  } catch (error) {
    return { type: 'text', value: `Could not change directory: ${String(error instanceof Error ? error.message : error)}` }
  }
  return { type: 'text', value: `Changed directory to: ${physical}` }
}
