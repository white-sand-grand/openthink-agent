import * as React from 'react'
import { ModelPicker } from '../../components/ModelPicker.js'
import { useAppState, useSetAppState } from '../../state/AppState.js'
import type {
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'
import {
  modelDisplayString,
  parseUserSpecifiedModel,
  type ModelSetting,
} from '../../utils/model/model.js'

/**
 * Standalone `/model` entry. The PromptInput-inline picker (meta+p) keeps its
 * own handler; both paths write `appState.mainLoopModel` and let
 * onChangeAppState persist `settings.model`.
 */
function ModelCommandPicker({
  onDone,
}: {
  onDone: LocalJSXCommandOnDone
}): React.ReactNode {
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  const sessionModel = useAppState(s => s.mainLoopModelForSession)
  const setAppState = useSetAppState()

  const handleSelect = (model: string | null) => {
    setAppState(prev => ({
      ...prev,
      mainLoopModel: model,
      mainLoopModelForSession: null,
    }))
    onDone(`Model set to ${modelDisplayString(model)}`)
  }

  return (
    <ModelPicker
      initial={mainLoopModel}
      sessionModel={sessionModel ?? undefined}
      onSelect={handleSelect}
      onCancel={() => onDone()}
      isStandaloneCommand
    />
  )
}

/**
 * Args path mirrors /effort's ApplyEffortAndClose: state writes must happen
 * in a component (hooks) — `call()` itself has no store access.
 */
function ApplyModelAndClose({
  model,
  onDone,
}: {
  model: ModelSetting
  onDone: LocalJSXCommandOnDone
}): React.ReactNode {
  const setAppState = useSetAppState()
  React.useEffect(() => {
    setAppState(prev => ({
      ...prev,
      mainLoopModel: model,
      mainLoopModelForSession: null,
    }))
    onDone(`Model set to ${modelDisplayString(model)}`)
  }, [setAppState, model, onDone])
  return null
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: unknown,
  args?: string,
): Promise<React.ReactNode> {
  const requested = args?.trim()
  if (!requested) {
    return <ModelCommandPicker onDone={onDone} />
  }
  // Model IDs never contain whitespace, and flag-like input is a usage
  // mistake — both would otherwise be persisted verbatim as the model string
  // (parseUserSpecifiedModel passes unknown names through for custom
  // endpoints), breaking every subsequent query until manually reverted.
  if (/\s/.test(requested) || requested.startsWith('-')) {
    onDone(
      `Invalid model: ${requested}. Usage: /model [model] — run /model without arguments to pick from the list.`,
    )
    return
  }
  const resolved = parseUserSpecifiedModel(requested)
  return <ApplyModelAndClose model={resolved} onDone={onDone} />
}
