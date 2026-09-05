import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { isTmuxControlMode, setRendererModeOverride } from '../../utils/fullscreen.js'
import type {
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'

type RendererMode = 'fullscreen' | 'classic'

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  args?: string,
): Promise<null> {
  const requested = args?.trim().toLowerCase()

  let mode: RendererMode
  if (requested === 'fullscreen' || requested === 'classic') {
    mode = requested
  } else if (!requested) {
    // No argument: toggle to the opposite of the current mode
    const current = getGlobalConfig().tui
    mode = current === 'fullscreen' ? 'classic' : 'fullscreen'
  } else {
    onDone(
      `Unknown renderer: ${args}. Usage: /tui [fullscreen|classic]`,
      { display: 'system' },
    )
    return null
  }

  // Alt-screen + mouse tracking corrupts tmux -CC sessions (double-click
  // scrambles terminal state, wheel is dead) — refuse rather than switch.
  if (mode === 'fullscreen' && isTmuxControlMode()) {
    onDone(
      'Cannot enable the fullscreen renderer under tmux -CC (iTerm2 integration mode): alt-screen and mouse tracking are unrecoverable there. Run /tui classic or detach tmux first.',
      { display: 'system' },
    )
    return null
  }

  // Persist the choice for future sessions, override the runtime heuristic
  // for this one, then bump the nonce so keyed layouts below FullscreenLayout
  // re-resolve their fullscreen conditionals. Conversation state lives in
  // REPL and survives — permission mode, model, and allowed tools carry over
  // (upstream 2.1.234's "safe to switch" guarantee).
  saveGlobalConfig(current => ({
    ...current,
    tui: mode,
  }))
  setRendererModeOverride(mode)
  context.setAppState?.(prev => ({
    ...prev,
    rendererNonce: (prev.rendererNonce ?? 0) + 1,
  }))

  onDone(
    mode === 'fullscreen'
      ? 'Switched to the fullscreen renderer. Run /tui classic to switch back — the conversation is preserved.'
      : 'Switched to the classic renderer. Terminal scrollback keeps the full transcript history.',
    { display: 'system' },
  )
  return null
}
