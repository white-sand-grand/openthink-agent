import React, { useCallback, useState } from 'react'
import type { Key } from '../ink.js'
import type { VimInputState, VimMode } from '../types/textInputTypes.js'
import { getGlobalConfig } from '../utils/config.js'
import { Cursor } from '../utils/Cursor.js'
import { lastGrapheme } from '../utils/intl.js'
import type { TextHighlight } from '../utils/textHighlighting.js'
import {
  executeIndent,
  executeJoin,
  executeOpenLine,
  executeOperatorFind,
  executeOperatorMotion,
  executeOperatorTextObj,
  executeReplace,
  executeToggleCase,
  executeX,
  type OperatorContext,
} from '../vim/operators.js'
import { resolveMotion } from '../vim/motions.js'
import { type TransitionContext, transition } from '../vim/transitions.js'
import {
  createInitialPersistentState,
  createInitialVimState,
  type PersistentState,
  type RecordedChange,
  type VimState,
} from '../vim/types.js'
import { type UseTextInputProps, useTextInput } from './useTextInput.js'

type UseVimInputProps = Omit<UseTextInputProps, 'inputFilter'> & {
  onModeChange?: (mode: VimMode) => void
  onUndo?: () => void
  inputFilter?: UseTextInputProps['inputFilter']
}

// Module-level (not per-hook-instance) so the yank register, last change,
// last find, and current mode survive unmounts — dialog round-trips
// (/config, /theme) and transcript peek (ctrl+o) remount the input, and
// upstream keeps the register (2.1.221) and NORMAL mode (2.1.239) across
// both. One interactive vim input exists at a time, so a single instance
// of this state is correct.
const globalPersistentState: PersistentState = createInitialPersistentState()
let globalVimMode: VimMode = 'INSERT'

// Module-level remap hold timer — one INSERT buffer across remounts.
let remapHoldTimer: ReturnType<typeof setTimeout> | null = null

const VISUAL_MOTION_KEYS = /^[hjklwbeWBE0^$]$/

export function useVimInput(props: UseVimInputProps): VimInputState {
  const vimStateRef = React.useRef<VimState>(createInitialVimState())
  const [mode, setModeState] = useState<VimMode>(globalVimMode)
  // Visual selection anchor. React state (not just the ref) because the
  // selection highlight derives from it — `o` (swap ends) must re-render.
  const [visualAnchor, setVisualAnchor] = useState(0)
  const visualAnchorRef = React.useRef(0)
  const visualCountRef = React.useRef(0)
  const remapBufferRef = React.useRef('')

  // The rest of the hook reads/writes persistentRef.current; pointing it at
  // the module-level object upgrades the register/lastFind to survive
  // remounts without touching those call sites.
  const persistentRef = { current: globalPersistentState }

  // inputFilter is applied once at the top of handleVimInput (not here) so
  // vim-handled paths that return without calling textInput.onInput still
  // run the filter — otherwise a stateful filter (e.g. lazy-space-after-
  // pill) stays armed across an Escape → NORMAL → INSERT round-trip.
  const textInput = useTextInput({ ...props, inputFilter: undefined })
  const { onModeChange, inputFilter } = props

  const applyMode = useCallback(
    (newMode: VimMode): void => {
      globalVimMode = newMode
      setModeState(newMode)
      onModeChange?.(newMode)
    },
    [onModeChange],
  )

  const switchToInsertMode = useCallback(
    (offset?: number): void => {
      if (offset !== undefined) {
        textInput.setOffset(offset)
      }
      vimStateRef.current = { mode: 'INSERT', insertedText: '' }
      applyMode('INSERT')
    },
    [textInput, applyMode],
  )

  const switchToNormalMode = useCallback((): void => {
    const current = vimStateRef.current
    if (current.mode === 'INSERT' && current.insertedText) {
      globalPersistentState.lastChange = {
        type: 'insert',
        text: current.insertedText,
      }
    }

    // Vim behavior: move cursor left by 1 when exiting insert mode
    // (unless at beginning of line or at offset 0)
    const offset = textInput.offset
    if (offset > 0 && props.value[offset - 1] !== '\n') {
      textInput.setOffset(offset - 1)
    }

    vimStateRef.current = { mode: 'NORMAL', command: { type: 'idle' } }
    applyMode('NORMAL')
  }, [applyMode, textInput, props.value])

  function createOperatorContext(
    cursor: Cursor,
    isReplay: boolean = false,
  ): OperatorContext {
    return {
      cursor,
      text: props.value,
      setText: (newText: string) => props.onChange(newText),
      setOffset: (offset: number) => textInput.setOffset(offset),
      enterInsert: (offset: number) => switchToInsertMode(offset),
      getRegister: () => globalPersistentState.register,
      setRegister: (content: string, linewise: boolean) => {
        globalPersistentState.register = content
        globalPersistentState.registerIsLinewise = linewise
      },
      getLastFind: () => globalPersistentState.lastFind,
      setLastFind: (type, char) => {
        globalPersistentState.lastFind = { type, char }
      },
      recordChange: isReplay
        ? () => {}
        : (change: RecordedChange) => {
            globalPersistentState.lastChange = change
          },
    }
  }

  function replayLastChange(): void {
    const change = globalPersistentState.lastChange
    if (!change) return

    const cursor = Cursor.fromText(props.value, props.columns, textInput.offset)
    const ctx = createOperatorContext(cursor, true)

    switch (change.type) {
      case 'insert':
        if (change.text) {
          const newCursor = cursor.insert(change.text)
          props.onChange(newCursor.text)
          textInput.setOffset(newCursor.offset)
        }
        break

      case 'x':
        executeX(change.count, ctx)
        break

      case 'replace':
        executeReplace(change.char, change.count, ctx)
        break

      case 'toggleCase':
        executeToggleCase(change.count, ctx)
        break

      case 'indent':
        executeIndent(change.dir, change.count, ctx)
        break

      case 'join':
        executeJoin(change.count, ctx)
        break

      case 'openLine':
        executeOpenLine(change.direction, ctx)
        break

      case 'operator':
        executeOperatorMotion(change.op, change.motion, change.count, ctx)
        break

      case 'operatorFind':
        executeOperatorFind(
          change.op,
          change.find,
          change.char,
          change.count,
          ctx,
        )
        break

      case 'operatorTextObj':
        executeOperatorTextObj(
          change.op,
          change.scope,
          change.objType,
          change.count,
          ctx,
        )
        break
    }
  }

  // ---------------------------------------------------------------------------
  // Visual mode (upstream 2.1.118: v / V)
  // ---------------------------------------------------------------------------

  function enterVisual(linewise: boolean): void {
    visualAnchorRef.current = textInput.offset
    setVisualAnchor(textInput.offset)
    visualCountRef.current = 0
    vimStateRef.current = {
      mode: linewise ? 'VISUAL_LINE' : 'VISUAL',
      anchor: textInput.offset,
      linewise,
    }
    applyMode(linewise ? 'VISUAL_LINE' : 'VISUAL')
  }

  function exitVisualToNormal(cursorTo?: number): void {
    if (cursorTo !== undefined) {
      textInput.setOffset(cursorTo)
    }
    visualCountRef.current = 0
    vimStateRef.current = { mode: 'NORMAL', command: { type: 'idle' } }
    applyMode('NORMAL')
  }

  /**
   * Selected range for the current visual state. Charwise includes the char
   * under the cursor (vim semantics); linewise extends to whole lines.
   */
  function getVisualSelection(
    state: {
      mode: 'VISUAL' | 'VISUAL_LINE'
      anchor: number
      linewise: boolean
    },
    offset: number,
  ): { start: number; end: number; text: string } {
    const text = props.value
    const lo = Math.min(state.anchor, offset)
    const hi = Math.max(state.anchor, offset)
    if (state.linewise) {
      const lineStart = text.lastIndexOf('\n', lo - 1) + 1
      const nextNl = text.indexOf('\n', hi)
      const lineEnd = nextNl === -1 ? text.length : nextNl + 1
      return {
        start: lineStart,
        end: lineEnd,
        text: text.slice(lineStart, lineEnd),
      }
    }
    const inclusiveEnd = Math.min(hi + 1, text.length)
    return {
      start: lo,
      end: inclusiveEnd,
      text: text.slice(lo, inclusiveEnd),
    }
  }

  function setRegisterFromSelection(
    selectionText: string,
    linewise: boolean,
  ): void {
    globalPersistentState.register = selectionText
    globalPersistentState.registerIsLinewise = linewise
  }

  /** Indent (or dedent) every line overlapping [start, end) by one level. */
  function shiftSelectionLines(
    start: number,
    end: number,
    dir: '>' | '<',
  ): void {
    const text = props.value
    const lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lastNl = text.indexOf('\n', Math.max(0, end - 1))
    const regionEnd = lastNl === -1 ? text.length : lastNl
    const block = text.slice(lineStart, regionEnd)
    const shifted = block
      .split('\n')
      .map(lineText => {
        if (dir === '>') {
          return lineText.length === 0 ? lineText : `  ${lineText}`
        }
        return lineText.replace(/^ {1,2}/, '')
      })
      .join('\n')
    props.onChange(text.slice(0, lineStart) + shifted + text.slice(regionEnd))
  }

  function handleVisualInput(
    input: string,
    key: Key,
    state: {
      mode: 'VISUAL' | 'VISUAL_LINE'
      anchor: number
      linewise: boolean
    },
  ): void {
    const offset = textInput.offset
    const linewise = state.linewise

    if (key.escape) {
      exitVisualToNormal(Math.min(state.anchor, offset))
      return
    }

    // v / V switch between charwise and linewise; pressing the same one
    // again exits (vim behavior).
    if (input === 'v') {
      if (linewise) {
        vimStateRef.current = {
          mode: 'VISUAL',
          anchor: state.anchor,
          linewise: false,
        }
        applyMode('VISUAL')
      } else {
        exitVisualToNormal()
      }
      return
    }
    if (input === 'V') {
      if (linewise) {
        exitVisualToNormal()
      } else {
        vimStateRef.current = {
          mode: 'VISUAL_LINE',
          anchor: state.anchor,
          linewise: true,
        }
        applyMode('VISUAL_LINE')
      }
      return
    }

    // o: swap the free end with the anchor end
    if (input === 'o') {
      visualAnchorRef.current = offset
      setVisualAnchor(offset)
      return
    }

    // Counts buffer for the next motion
    if (/^[1-9]$/.test(input)) {
      visualCountRef.current = visualCountRef.current * 10 + Number(input)
      return
    }
    if (input === '0' && visualCountRef.current > 0) {
      visualCountRef.current = visualCountRef.current * 10
      return
    }

    // Motions extend the selection
    let motionKey: string | null = null
    const motionCount = visualCountRef.current || 1
    if (key.leftArrow) motionKey = 'h'
    else if (key.rightArrow) motionKey = 'l'
    else if (key.upArrow) motionKey = 'k'
    else if (key.downArrow) motionKey = 'j'
    else if (input === 'G') {
      textInput.setOffset(props.value.length)
      visualCountRef.current = 0
      return
    } else if (VISUAL_MOTION_KEYS.test(input)) motionKey = input

    if (motionKey) {
      const cursor = Cursor.fromText(props.value, props.columns, offset)
      const next = resolveMotion(motionKey, cursor, motionCount)
      textInput.setOffset(next.offset)
      visualCountRef.current = 0
      return
    }

    // Operators on the selection
    const selection = getVisualSelection(state, offset)

    if (input === 'd' || input === 'x' || input === 'D' || input === 'X') {
      const text = props.value
      setRegisterFromSelection(selection.text, linewise)
      props.onChange(text.slice(0, selection.start) + text.slice(selection.end))
      exitVisualToNormal(selection.start)
      return
    }

    if (input === 'c' || input === 's') {
      const text = props.value
      setRegisterFromSelection(selection.text, linewise)
      props.onChange(text.slice(0, selection.start) + text.slice(selection.end))
      switchToInsertMode(selection.start)
      return
    }

    if (input === 'y') {
      setRegisterFromSelection(selection.text, linewise)
      exitVisualToNormal(selection.start)
      return
    }

    if (input === 'u' || input === 'U') {
      const text = props.value
      const transformed =
        input === 'u'
          ? selection.text.toLowerCase()
          : selection.text.toUpperCase()
      props.onChange(
        text.slice(0, selection.start) +
          transformed +
          text.slice(selection.end),
      )
      exitVisualToNormal(selection.start)
      return
    }

    if (input === '>' || input === '<') {
      shiftSelectionLines(selection.start, selection.end, input)
      exitVisualToNormal(Math.min(selection.start, props.value.length))
      return
    }

    if (input === 'p' || input === 'P') {
      const text = props.value
      const register = globalPersistentState.register
      const pasted =
        linewise && !globalPersistentState.registerIsLinewise
          ? `${register}\n`
          : register
      props.onChange(
        text.slice(0, selection.start) + pasted + text.slice(selection.end),
      )
      exitVisualToNormal(selection.start + pasted.length)
      return
    }

    // Unknown keys are ignored in visual mode (stay selected)
  }

  // ---------------------------------------------------------------------------
  // Insert-mode remaps (upstream 2.1.208, e.g. "jj" → Esc)
  // ---------------------------------------------------------------------------

  function flushRemapBuffer(): void {
    const held = remapBufferRef.current
    if (remapHoldTimer) {
      clearTimeout(remapHoldTimer)
      remapHoldTimer = null
    }
    remapBufferRef.current = ''
    if (!held) return
    const cursor = Cursor.fromText(props.value, props.columns, textInput.offset)
    const newCursor = cursor.insert(held)
    props.onChange(newCursor.text)
    textInput.setOffset(newCursor.offset)
    const current = vimStateRef.current
    if (current.mode === 'INSERT') {
      vimStateRef.current = {
        mode: 'INSERT',
        insertedText: current.insertedText + held,
      }
    }
  }

  /**
   * Returns true when the key was consumed by remap matching (held as a
   * potential multi-key sequence prefix, or fired a remap). Only mappings
   * with target 'esc' are honored — the documented upstream use case.
   */
  function handleInsertRemap(input: string): boolean {
    const remaps = getGlobalConfig().vimInsertModeRemaps
    const entries = Object.entries(remaps ?? {}).filter(
      ([k, v]) => k.length > 0 && v === 'esc',
    )
    if (entries.length === 0) return false

    const buffered = remapBufferRef.current + input
    const exact = entries.find(([k]) => k === buffered)
    if (exact) {
      remapBufferRef.current = ''
      if (remapHoldTimer) {
        clearTimeout(remapHoldTimer)
        remapHoldTimer = null
      }
      switchToNormalMode()
      return true
    }
    if (entries.some(([k]) => k.startsWith(buffered))) {
      // Strict prefix of a longer remap — hold, with a typing-pause fallback
      remapBufferRef.current = buffered
      if (remapHoldTimer) clearTimeout(remapHoldTimer)
      remapHoldTimer = setTimeout(() => flushRemapBuffer(), 300)
      return true
    }
    // No match: flush anything held, then let this key insert normally
    if (remapBufferRef.current) {
      flushRemapBuffer()
    }
    return false
  }

  function handleVimInput(rawInput: string, key: Key): void {
    const state = vimStateRef.current
    // Run inputFilter in all modes so stateful filters disarm on any key,
    // but only apply the transformed input in INSERT — NORMAL-mode command
    // lookups expect single chars and a prepended space would break them.
    const filtered = inputFilter ? inputFilter(rawInput, key) : rawInput
    const input = state.mode === 'INSERT' ? filtered : rawInput
    const cursor = Cursor.fromText(props.value, props.columns, textInput.offset)

    if (key.ctrl) {
      textInput.onInput(input, key)
      return
    }

    // NOTE(keybindings): This escape handler is intentionally NOT migrated to the keybindings system.
    // It's vim's standard INSERT->NORMAL mode switch - a vim-specific behavior that should not be
    // configurable via keybindings. Vim users expect Esc to always exit INSERT mode.
    if (key.escape && state.mode === 'INSERT') {
      // Flush a held remap prefix (e.g. a lone "j") before leaving INSERT
      if (remapBufferRef.current) flushRemapBuffer()
      switchToNormalMode()
      return
    }

    // Escape in NORMAL mode cancels any pending command (replace, operator, etc.)
    if (key.escape && state.mode === 'NORMAL') {
      vimStateRef.current = { mode: 'NORMAL', command: { type: 'idle' } }
      return
    }

    // Pass Enter to base handler regardless of mode (allows submission from NORMAL)
    if (key.return) {
      if (state.mode === 'INSERT' && remapBufferRef.current) flushRemapBuffer()
      textInput.onInput(input, key)
      return
    }

    if (state.mode === 'INSERT') {
      // Insert-mode remaps intercept printable single-char input only
      if (
        input.length === 1 &&
        !key.backspace &&
        !key.delete &&
        handleInsertRemap(input)
      ) {
        return
      }
      if (remapBufferRef.current && (key.backspace || key.delete)) {
        flushRemapBuffer()
      }
      // Track inserted text for dot-repeat
      if (key.backspace || key.delete) {
        if (state.insertedText.length > 0) {
          vimStateRef.current = {
            mode: 'INSERT',
            insertedText: state.insertedText.slice(
              0,
              -(lastGrapheme(state.insertedText).length || 1),
            ),
          }
        }
      } else {
        vimStateRef.current = {
          mode: 'INSERT',
          insertedText: state.insertedText + input,
        }
      }
      textInput.onInput(input, key)
      return
    }

    if (state.mode === 'VISUAL' || state.mode === 'VISUAL_LINE') {
      handleVisualInput(input, key, state)
      return
    }

    if (state.mode !== 'NORMAL') {
      return
    }

    // In idle state, delegate arrow keys to base handler for cursor movement
    // and history fallback (upOrHistoryUp / downOrHistoryDown)
    if (
      state.command.type === 'idle' &&
      (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)
    ) {
      textInput.onInput(input, key)
      return
    }

    // Enter visual mode from idle NORMAL (upstream 2.1.118)
    if (state.command.type === 'idle' && input === 'v') {
      enterVisual(false)
      return
    }
    if (state.command.type === 'idle' && input === 'V') {
      enterVisual(true)
      return
    }

    const ctx: TransitionContext = {
      ...createOperatorContext(cursor, false),
      onUndo: props.onUndo,
      onDotRepeat: replayLastChange,
    }

    // Backspace/Delete are only mapped in motion-expecting states. In
    // literal-char states (replace, find, operatorFind), mapping would turn
    // r+Backspace into "replace with h" and df+Delete into "delete to next x".
    // Delete additionally skips count state: in vim, N<Del> removes a count
    // digit rather than executing Nx; we don't implement digit removal but
    // should at least not turn a cancel into a destructive Nx.
    const expectsMotion =
      state.command.type === 'idle' ||
      state.command.type === 'count' ||
      state.command.type === 'operator' ||
      state.command.type === 'operatorCount'

    // Map arrow keys to vim motions in NORMAL mode
    let vimInput = input
    if (key.leftArrow) vimInput = 'h'
    else if (key.rightArrow) vimInput = 'l'
    else if (key.upArrow) vimInput = 'k'
    else if (key.downArrow) vimInput = 'j'
    else if (expectsMotion && key.backspace) vimInput = 'h'
    else if (expectsMotion && state.command.type !== 'count' && key.delete)
      vimInput = 'x'

    const result = transition(state.command, vimInput, ctx)

    if (result.execute) {
      result.execute()
    }

    // Update command state (only if execute didn't switch to INSERT)
    if (vimStateRef.current.mode === 'NORMAL') {
      if (result.next) {
        vimStateRef.current = { mode: 'NORMAL', command: result.next }
      } else if (result.execute) {
        vimStateRef.current = { mode: 'NORMAL', command: { type: 'idle' } }
      }
    }

    if (
      input === '?' &&
      state.mode === 'NORMAL' &&
      state.command.type === 'idle'
    ) {
      props.onChange('?')
    }
  }

  const setModeExternal = useCallback(
    (newMode: VimMode) => {
      if (newMode === 'INSERT') {
        vimStateRef.current = { mode: 'INSERT', insertedText: '' }
      } else if (newMode === 'VISUAL' || newMode === 'VISUAL_LINE') {
        vimStateRef.current = {
          mode: newMode,
          anchor: textInput.offset,
          linewise: newMode === 'VISUAL_LINE',
        }
        visualAnchorRef.current = textInput.offset
        setVisualAnchor(textInput.offset)
      } else {
        vimStateRef.current = { mode: 'NORMAL', command: { type: 'idle' } }
      }
      applyMode(newMode)
    },
    [applyMode, textInput],
  )

  // Selection highlight while in visual mode. `mode`/`visualAnchor` are
  // reactive; textInput.offset updates on every motion, so the highlight
  // tracks the moving end live.
  let visualHighlights: TextHighlight[] | undefined
  if (mode === 'VISUAL' || mode === 'VISUAL_LINE') {
    const state = vimStateRef.current
    if (state.mode === 'VISUAL' || state.mode === 'VISUAL_LINE') {
      const selection = getVisualSelection(
        { mode, anchor: visualAnchor, linewise: mode === 'VISUAL_LINE' },
        textInput.offset,
      )
      visualHighlights = [
        {
          start: selection.start,
          end: selection.end,
          color: undefined,
          inverse: true,
          priority: 15,
        },
      ]
    }
  }

  return {
    ...textInput,
    onInput: handleVimInput,
    mode,
    setMode: setModeExternal,
    highlights: visualHighlights,
  }
}
