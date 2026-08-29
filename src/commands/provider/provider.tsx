import * as React from 'react'
import { ProviderPicker } from '../../components/ProviderPicker.js'
import type { ToolUseContext } from '../../Tool.js'
import type {
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'
import {
  getActiveProviderId,
  getProviderEntry,
} from '../../utils/model/apiProviders.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: ToolUseContext & LocalJSXCommandContext,
  _args: string,
): Promise<React.ReactNode> {
  return (
    <ProviderPicker
      standalone
      onBack={() => {
        const activeId = getActiveProviderId()
        if (activeId) {
          const entry = getProviderEntry(activeId)
          onDone(
            `已停用第三方提供商,恢复 Anthropic 默认端点(之前: ${entry?.name ?? activeId})`,
            { display: 'system' },
          )
        } else {
          onDone(undefined, { display: 'skip' })
        }
      }}
      onPicked={modelId => {
        const activeId = getActiveProviderId()
        const entry = activeId ? getProviderEntry(activeId) : undefined
        onDone(
          `已切换到 ${entry?.name ?? activeId ?? '自定义端点'} · ${modelId},立即生效,无需重启`,
          { display: 'system' },
        )
      }}
    />
  )
}
