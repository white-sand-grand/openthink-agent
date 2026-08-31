import type React from 'react'

type Props = {
  pluginName: string
  pluginDescription?: string
  marketplaceName: string
  sourceCommand: string
  onResponse: (response: 'yes' | 'no' | 'never' | 'disable') => void
}

/** The plugin-hint UI is disabled in this restored build. */
export function PluginHintMenu(_props: Props): React.ReactNode {
  return null
}
