import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { Select } from '../../components/CustomSelect/index.js'
import { Pane } from '../../components/design-system/Pane.js'
import type {
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'
import type { LogOption } from '../../types/logs.js'
import {
  getClearedSessions,
  loadFullLog,
  type ClearedSessionInfo,
} from '../../utils/sessionStorage.js'
import { validateUuid } from '../../utils/uuid.js'

function RewindPicker({
  sessions,
  onPick,
  onCancel,
}: {
  sessions: ClearedSessionInfo[]
  onPick: (sessionId: string) => void
  onCancel: () => void
}): React.ReactNode {
  const options = sessions.map(session => ({
    value: session.sessionId,
    label: session.title,
    description: new Date(session.mtime).toLocaleString(),
  }))
  return (
    <Pane color="permission">
      <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text bold>Restore cleared conversation</Text>
          <Text dimColor>
            These conversations were discarded by /clear in this project.
          </Text>
        </Box>
        <Select
          options={options}
          onChange={value => onPick(value)}
          onCancel={onCancel}
        />
      </Box>
    </Pane>
  )
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
): Promise<React.ReactNode> {
  const cleared = await getClearedSessions()

  // No cleared snapshots — fall back to the message-level rewind selector
  // (the pre-existing /rewind behavior for mid-conversation checkpoints).
  if (cleared.length === 0 || !context.resume) {
    if (context.openMessageSelector) {
      context.openMessageSelector()
    }
    onDone(undefined, { display: 'skip' })
    return null
  }

  const handlePick = async (sessionId: string): Promise<void> => {
    const info = cleared.find(session => session.sessionId === sessionId)
    const uuid = validateUuid(sessionId)
    if (!info || !uuid) {
      onDone('Failed to restore conversation', { display: 'system' })
      return
    }
    // Upgrade the lite entry to full messages, then hand off to the same
    // restore pipeline /resume uses (session switch, metadata, hooks).
    const fullLog: LogOption = await loadFullLog(info.liteLog)
    onDone(undefined, { display: 'skip' })
    void context.resume(uuid, fullLog, 'slash_command_picker')
  }

  return (
    <RewindPicker
      sessions={cleared}
      onPick={sessionId => void handlePick(sessionId)}
      onCancel={() => onDone(undefined, { display: 'skip' })}
    />
  )
}
