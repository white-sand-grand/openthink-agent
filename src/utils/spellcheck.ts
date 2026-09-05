import { getSettings_DEPRECATED } from './settings/settings.js'
import { execFileNoThrow } from './execFileNoThrow.js'

/**
 * Prompt spellcheck (upstream 2.1.235). Detects aspell/hunspell/ispell once
 * per session; when none exists (the norm on Windows) the feature is silent —
 * no warning, no error, no highlight. Off by default (`spellcheck` setting).
 *
 * Deviation from upstream: highlights use the error theme color via the
 * existing TextHighlight pipeline instead of underline — the input renderer's
 * highlight model has color/dim/inverse only, no underline field.
 */

const CHECKER_CANDIDATES = ['aspell', 'hunspell', 'ispell'] as const
const WORD_RE = /[A-Za-z][A-Za-z\x27\u2019-]{1,}/g
const MAX_TEXT_LENGTH = 4_000
const MAX_WORDS = 200
const DETECT_TIMEOUT_MS = 1_500
const CHECK_TIMEOUT_MS = 2_000

export type SpellcheckRange = { start: number; end: number }

export function isSpellcheckEnabled(): boolean {
  return getSettings_DEPRECATED()?.spellcheck === true
}

let cachedChecker: string | null | undefined

async function detectChecker(): Promise<string | null> {
  if (cachedChecker !== undefined) return cachedChecker
  cachedChecker = null
  for (const candidate of CHECKER_CANDIDATES) {
    // `which` is absent on Windows cmd/PowerShell environments — the failure
    // lands in the catch and the feature stays off, which is the desired
    // graceful degradation there.
    try {
      const result = await execFileNoThrow(
        'which',
        [candidate],
        { timeout: DETECT_TIMEOUT_MS, useCwd: false, preserveOutputOnError: false },
      )
      if (result.code === 0 && result.stdout.trim().length > 0) {
        cachedChecker = candidate
        break
      }
    } catch {
      // Try the next candidate
    }
  }
  return cachedChecker
}

function checkerArgs(checker: string): string[] {
  // `list`/`-l` modes print one misspelled word per line, nothing else.
  switch (checker) {
    case 'aspell':
      // -H: HTML-ish input mode so a stray token can't trigger SGML parsing
      return ['list', '--encoding=utf-8', '-H']
    case 'hunspell':
      return ['-l']
    default:
      return ['-l']
  }
}

/**
 * Ranges of latin words the local spellchecker flags as misspelled. Colors
 * and layout keywords, slash commands, and code are the caller's concern —
 * this function only filters to natural-language-looking tokens.
 * Returns [] on any failure so the input never breaks because of us.
 */
export async function findMisspelledRanges(
  text: string,
): Promise<SpellcheckRange[]> {
  if (!isSpellcheckEnabled()) return []
  if (text.length === 0 || text.length > MAX_TEXT_LENGTH) return []

  const checker = await detectChecker()
  if (!checker) return []

  const words = new Set<string>()
  for (const m of text.matchAll(WORD_RE)) {
    // Skip all-caps tokens (acronyms: API, TODO) and single letters
    if (m[0].length < 2) continue
    if (m[0] === m[0].toUpperCase() && m[0].length > 1) continue
    words.add(m[0])
    if (words.size > MAX_WORDS) return []
  }
  if (words.size === 0) return []

  let stdout: string
  try {
    const result = await execFileNoThrow(
      checker,
      checkerArgs(checker),
      {
        timeout: CHECK_TIMEOUT_MS,
        useCwd: false,
        preserveOutputOnError: false,
        input: [...words].join('\n') + '\n',
      },
    )
    if (result.code !== 0) return []
    stdout = result.stdout
  } catch {
    return []
  }

  const misspelled = new Set(
    stdout
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(Boolean),
  )
  if (misspelled.size === 0) return []

  const ranges: SpellcheckRange[] = []
  for (const m of text.matchAll(WORD_RE)) {
    if (misspelled.has(m[0].toLowerCase())) {
      ranges.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length })
    }
  }
  return ranges
}
