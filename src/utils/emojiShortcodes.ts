import { getSettings_DEPRECATED } from './settings/settings.js'
import type { SuggestionItem } from '../components/PromptInput/PromptInputFooterSuggestions.js'

/**
 * Emoji short-code completion (upstream 2.1.217 + 2.1.221 aliases).
 *
 * A curated subset of gemoji: the shortcodes that actually appear in commit
 * messages, PRs, and chat — not the full ~1800-entry list. Aliases follow
 * gemoji naming (:thumbsup:, :white_check_mark:, :tada:, ...). Kept as a flat
 * table so lookup is a substring filter with no trie/fuzzy machinery.
 */
const EMOJI_SHORTCODES: ReadonlyArray<readonly [string, string]> = [
  ['heart', '❤️'],
  ['orange_heart', '🧡'],
  ['yellow_heart', '💛'],
  ['green_heart', '💚'],
  ['blue_heart', '💙'],
  ['purple_heart', '💜'],
  ['broken_heart', '💔'],
  ['sparkling_heart', '💖'],
  ['sparkles', '✨'],
  ['star', '⭐'],
  ['star2', '🌟'],
  ['fire', '🔥'],
  ['rocket', '🚀'],
  ['tada', '🎉'],
  ['confetti_ball', '🎊'],
  ['trophy', '🏆'],
  ['medal', '🏅'],
  ['thumbsup', '👍'],
  ['thumbsdown', '👎'],
  ['ok_hand', '👌'],
  ['wave', '👋'],
  ['clap', '👏'],
  ['pray', '🙏'],
  ['muscle', '💪'],
  ['point_right', '👉'],
  ['eyes', '👀'],
  ['brain', '🧠'],
  ['smile', '😄'],
  ['smiley', '😃'],
  ['grin', '😁'],
  ['joy', '😂'],
  ['rofl', '🤣'],
  ['wink', '😉'],
  ['blush', '😊'],
  ['innocent', '😇'],
  ['thinking', '🤔'],
  ['neutral_face', '😐'],
  ['expressionless', '😑'],
  ['sob', '😭'],
  ['cry', '😢'],
  ['angry', '😠'],
  ['rage', '😡'],
  ['scream', '😱'],
  ['zany_face', '🤪'],
  ['sunglasses', '😎'],
  ['sleeping', '😴'],
  ['ghost', '👻'],
  ['skull', '💀'],
  ['alien', '👽'],
  ['robot', '🤖'],
  ['poop', '💩'],
  ['clown_face', '🤡'],
  ['shushing_face', '🤫'],
  ['shrug', '🤷'],
  ['facepalm', '🤦'],
  ['white_check_mark', '✅'],
  ['heavy_check_mark', '✔️'],
  ['ballot_box_with_check', '☑️'],
  ['x', '❌'],
  ['negative_squared_cross_mark', '❎'],
  ['exclamation', '❗'],
  ['question', '❓'],
  ['warning', '⚠️'],
  ['no_entry', '⛔'],
  ['no_entry_sign', '🚫'],
  ['bangbang', '‼️'],
  ['interrobang', '⁉️'],
  ['100', '💯'],
  ['zap', '⚡'],
  ['boom', '💥'],
  ['bulb', '💡'],
  ['bell', '🔔'],
  ['lock', '🔒'],
  ['unlock', '🔓'],
  ['key', '🔑'],
  ['shield', '🛡️'],
  ['link', '🔗'],
  ['paperclip', '📎'],
  ['pushpin', '📌'],
  ['scissors', '✂️'],
  ['pencil2', '✏️'],
  ['memo', '📝'],
  ['clipboard', '📋'],
  ['bookmark', '🔖'],
  ['bookmark_tabs', '📑'],
  ['open_file_folder', '📂'],
  ['file_folder', '📁'],
  ['card_file_box', '🗃️'],
  ['chart_with_upwards_trend', '📈'],
  ['chart_with_downwards_trend', '📉'],
  ['bar_chart', '📊'],
  ['date', '📅'],
  ['calendar', '📆'],
  ['clock3', '🕒'],
  ['hourglass', '⌛'],
  ['alarm_clock', '⏰'],
  ['stopwatch', '⏱️'],
  ['mag', '🔍'],
  ['mag_right', '🔎'],
  ['globe_with_meridians', '🌐'],
  ['earth_americas', '🌎'],
  ['computer', '💻'],
  ['desktop_computer', '🖥️'],
  ['iphone', '📱'],
  ['battery', '🔋'],
  ['plug', '🔌'],
  ['floppy_disk', '💾'],
  ['minidisc', '💽'],
  ['dvd', '📀'],
  ['package', '📦'],
  ['mailbox', '📬'],
  ['e-mail', '📧'],
  ['inbox_tray', '📥'],
  ['outbox_tray', '📤'],
  ['wastebasket', '🗑️'],
  ['hammer', '🔨'],
  ['wrench', '🔧'],
  ['gear', '⚙️'],
  ['nut_and_bolt', '🔩'],
  ['microscope', '🔬'],
  ['telescope', '🔭'],
  ['satellite', '📡'],
  ['battery_full', '🔋'],
  ['seedling', '🌱'],
  ['evergreen_tree', '🌲'],
  ['deciduous_tree', '🌳'],
  ['cactus', '🌵'],
  ['sun_with_face', '🌞'],
  ['crescent_moon', '🌙'],
  ['rainbow', '🌈'],
  ['cloud', '☁️'],
  ['snowflake', '❄️'],
  ['ocean', '🌊'],
  ['coffee', '☕'],
  ['tea', '🍵'],
  ['beer', '🍺'],
  ['beers', '🍻'],
  ['pizza', '🍕'],
  ['hamburger', '🍔'],
  ['cake', '🎂'],
  ['birthday', '🎂'],
  ['apple', '🍎'],
  ['banana', '🍌'],
  ['avocado', '🥑'],
  ['egg', '🥚'],
  ['dog', '🐶'],
  ['cat', '🐱'],
  ['mouse', '🐭'],
  ['fox_face', '🦊'],
  ['bear', '🐻'],
  ['panda_face', '🐼'],
  ['chicken', '🐔'],
  ['bird', '🐦'],
  ['bee', '🐝'],
  ['butterfly', '🦋'],
  ['turtle', '🐢'],
  ['snake', '🐍'],
  ['octopus', '🐙'],
  ['whale', '🐳'],
  ['dolphin', '🐬'],
  ['shrimp', '🦐'],
  ['car', '🚗'],
  ['taxi', '🚕'],
  ['bus', '🚌'],
  ['train2', '🚆'],
  ['airplane', '✈️'],
  ['ship', '🚢'],
  ['house', '🏠'],
  ['office', '🏢'],
  ['hospital', '🏥'],
  ['bank', '🏦'],
  ['school', '🏫'],
  ['moneybag', '💰'],
  ['dollar', '💵'],
  ['credit_card', '💳'],
  ['gift', '🎁'],
  ['balloon', '🎈'],
  ['crown', '👑'],
  ['gem', '💎'],
  ['musical_note', '🎵'],
  ['notes', '🎶'],
  ['art', '🎨'],
  ['clapper', '🎬'],
  ['camera', '📷'],
  ['video_camera', '📹'],
  ['headphones', '🎧'],
  ['microphone', '🎤'],
  ['phone', '☎️'],
  ['books', '📚'],
  ['book', '📖'],
  ['newspaper', '📰'],
  ['mega', '📣'],
  ['speech_balloon', '💬'],
  ['thought_balloon', '💭'],
  ['runner', '🏃'],
  ['handshake', '🤝'],
  ['heart_eyes', '😍'],
  ['kissing_heart', '😘'],
  ['upside_down_face', '🙃'],
  ['moyai', '🗿'],
  ['flashlight', '🔦'],
  ['cyclone', '🌀'],
  ['checkered_flag', '🏁'],
  ['triangular_flag_on_post', '🚩'],
]

export function isEmojiCompletionEnabled(): boolean {
  return getSettings_DEPRECATED()?.emojiCompletionEnabled !== false
}

const EMOJI_TOKEN_RE = /(^|\s):([a-zA-Z0-9_+-]{0,32})$/

/**
 * Extract a completable `:shortcode` token at the cursor. The token must be
 * preceded by start-of-line or whitespace so times (12:30), URLs
 * (https://…), and scope paths (src:foo) never trigger the popup.
 */
export function extractEmojiToken(
  text: string,
  cursorPos: number,
): { token: string; startPos: number } | null {
  if (cursorPos <= 0 || cursorPos > text.length) return null
  const before = text.slice(0, cursorPos)
  const m = before.match(EMOJI_TOKEN_RE)
  if (!m || m.index === undefined) return null
  return { token: m[2] ?? '', startPos: m.index + m[1].length }
}

/**
 * Suggestions for a `:token` — prefix matches first, then substring, capped
 * to keep the popup snappy (the overlay itself shows 5).
 */
export function getEmojiCompletions(token: string): SuggestionItem[] {
  if (!token) return []
  const lower = token.toLowerCase()
  const prefix: SuggestionItem[] = []
  const substring: SuggestionItem[] = []
  for (const [code, emoji] of EMOJI_SHORTCODES) {
    if (code.startsWith(lower)) {
      prefix.push({
        id: `emoji-${code}`,
        displayText: emoji,
        description: `:${code}:`,
      })
    } else if (code.includes(lower)) {
      substring.push({
        id: `emoji-${code}`,
        displayText: emoji,
        description: `:${code}:`,
      })
    }
    if (prefix.length >= 8) break
  }
  return [...prefix, ...substring].slice(0, 8)
}

/**
 * Replace the `:token` before the cursor with the emoji plus one trailing
 * space. No-op (input untouched) when the token vanished mid-apply.
 */
export function applyEmojiCompletion(
  input: string,
  cursorOffset: number,
  emoji: string,
): { newInput: string; cursorPos: number } {
  const token = extractEmojiToken(input, cursorOffset)
  if (!token) return { newInput: input, cursorPos: cursorOffset }
  const before = input.slice(0, token.startPos)
  const after = input.slice(cursorOffset)
  const replacement = `${emoji} `
  const newInput = before + replacement + after
  return { newInput, cursorPos: before.length + replacement.length }
}
