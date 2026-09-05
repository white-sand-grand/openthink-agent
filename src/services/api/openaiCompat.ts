import { logForDebugging } from '../../utils/debug.js'

/**
 * OpenAI-wire-format adapter.
 *
 * The whole app speaks the Anthropic Messages protocol internally (the
 * `@anthropic-ai/sdk` surface). For providers that only expose the OpenAI
 * Chat Completions protocol, this module returns a shim exposing the exact
 * subset of that surface the app uses —
 *
 *   beta.messages.create(params, options)   (streaming + non-streaming)
 *   beta.messages.countTokens(params)
 *   models.list()
 *
 * — translating requests to /chat/completions and translating OpenAI SSE
 * chunks back into BetaRawMessageStreamEvent sequences. Scope: text,
 * images (base64/URL), tool declarations + tool_use/tool_result round-trip,
 * reasoning_content → thinking deltas. Prompt caching: Anthropic
 * cache_control has no OpenAI equivalent and is dropped — caching over this
 * adapter relies on the gateway/provider's own prefix caching, and usage
 * reports zero cache tokens rather than fabricating them. Betas / server tools
 * have no OpenAI equivalent and are dropped.
 */

type JsonObject = Record<string, unknown>

type AnthropicBlock = {
  type: string
  text?: string
  source?: { type: string; media_type?: string; data?: string; url?: string }
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: unknown
  is_error?: boolean
  thinking?: string
}

type AnthropicMessageParam = {
  role: 'user' | 'assistant'
  content: string | AnthropicBlock[]
}

type AnthropicCreateParams = {
  model: string
  max_tokens?: number
  messages: AnthropicMessageParam[]
  system?: string | Array<{ type: 'text'; text: string }>
  tools?: Array<{ name: string; description?: string; input_schema?: unknown }>
  tool_choice?: { type: string; name?: string }
  temperature?: number
  top_p?: number
  stop_sequences?: string[]
  stream?: boolean
  [key: string]: unknown
}

type CreateOptions = {
  signal?: AbortSignal
  timeout?: number
  headers?: Record<string, string>
  [key: string]: unknown
}

/** OpenAI base URLs may or may not carry the /vN version segment. */
export function chatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  if (/\/chat\/completions$/.test(base)) return base
  if (/\/v\d+$/.test(base)) return `${base}/chat/completions`
  return `${base}/v1/chat/completions`
}

// ---------------------------------------------------------------------------
// Request translation: Anthropic Messages -> Chat Completions
// ---------------------------------------------------------------------------

function systemToOpenAI(system: AnthropicCreateParams['system']): JsonObject[] {
  if (!system) return []
  const text =
    typeof system === 'string'
      ? system
      : system.map(b => b.text).join('\n\n')
  return [{ role: 'system', content: text }]
}

function imageBlockToOpenAI(block: AnthropicBlock): JsonObject | null {
  const source = block.source
  if (!source) return null
  if (source.type === 'base64' && source.media_type && source.data) {
    return {
      type: 'image_url',
      image_url: { url: `data:${source.media_type};base64,${source.data}` },
    }
  }
  if (source.type === 'url' && source.url) {
    return { type: 'image_url', image_url: { url: source.url } }
  }
  return null
}

function translateMessages(
  messages: AnthropicMessageParam[],
): JsonObject[] {
  const out: JsonObject[] = []
  for (const message of messages) {
    const blocks: AnthropicBlock[] =
      typeof message.content === 'string'
        ? [{ type: 'text', text: message.content }]
        : message.content ?? []

    if (message.role === 'assistant') {
      const contentParts: JsonObject[] = []
      const toolCalls: JsonObject[] = []
      for (const block of blocks) {
        if (block.type === 'text' && block.text) {
          contentParts.push({ type: 'text', text: block.text })
        } else if (block.type === 'tool_use' && block.id && block.name) {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input ?? {}),
            },
          })
        }
        // thinking blocks: no OpenAI equivalent on the request side — dropped
      }
      const msg: JsonObject = { role: 'assistant', content: contentParts.length > 0 ? contentParts : null }
      if (toolCalls.length > 0) msg.tool_calls = toolCalls
      out.push(msg)
      continue
    }

    // user messages: text/image inline; tool_result blocks become role:tool
    const contentParts: JsonObject[] = []
    for (const block of blocks) {
      if (block.type === 'text' && block.text !== undefined) {
        contentParts.push({ type: 'text', text: block.text })
      } else if (block.type === 'image') {
        const image = imageBlockToOpenAI(block)
        if (image) contentParts.push(image)
      } else if (block.type === 'tool_result') {
        const resultText =
          typeof block.content === 'string'
            ? block.content
            : Array.isArray(block.content)
              ? (block.content as AnthropicBlock[])
                  .map(b => (b.type === 'text' ? b.text ?? '' : `[${b.type}]`))
                  .join('\n')
              : ''
        out.push({
          role: 'tool',
          tool_call_id: block.tool_use_id ?? '',
          content: resultText || '(empty tool result)',
        })
      }
      // other block types dropped
    }
    if (contentParts.length > 0) {
      out.push({ role: 'user', content: contentParts })
    }
  }
  return out
}

function translateTools(
  tools: AnthropicCreateParams['tools'],
): JsonObject[] | undefined {
  if (!tools || tools.length === 0) return undefined
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      ...(tool.description ? { description: tool.description } : {}),
      parameters: tool.input_schema ?? { type: 'object', properties: {} },
    },
  }))
}

function translateToolChoice(
  toolChoice: AnthropicCreateParams['tool_choice'],
): string | JsonObject | undefined {
  if (!toolChoice) return undefined
  switch (toolChoice.type) {
    case 'auto':
      return 'auto'
    case 'any':
      return 'required'
    case 'none':
      return 'none'
    case 'tool':
      return toolChoice.name
        ? { type: 'function', function: { name: toolChoice.name } }
        : 'auto'
    default:
      return undefined
  }
}

function buildChatBody(
  params: AnthropicCreateParams,
  stream: boolean,
): JsonObject {
  const body: JsonObject = {
    model: params.model,
    max_tokens: params.max_tokens,
    messages: [
      ...systemToOpenAI(params.system),
      ...translateMessages(params.messages ?? []),
    ],
    stream,
  }
  const tools = translateTools(params.tools)
  if (tools) body.tools = tools
  const toolChoice = translateToolChoice(params.tool_choice)
  if (toolChoice !== undefined) body.tool_choice = toolChoice
  if (params.temperature !== undefined) body.temperature = params.temperature
  if (params.top_p !== undefined) body.top_p = params.top_p
  if (params.stop_sequences?.length) body.stop = params.stop_sequences
  return body
}

// ---------------------------------------------------------------------------
// Response translation: Chat Completions -> Anthropic
// ---------------------------------------------------------------------------

type OpenAIChoice = {
  message?: {
    role?: string
    content?: string | null
    tool_calls?: Array<{
      id?: string
      type?: string
      function?: { name?: string; arguments?: string }
    }>
    reasoning_content?: string | null
  }
  delta?: {
    content?: string | null
    tool_calls?: Array<{
      index?: number
      id?: string
      function?: { name?: string; arguments?: string }
    }>
    reasoning_content?: string | null
  }
  finish_reason?: string | null
}

type OpenAIResponse = {
  id?: string
  model?: string
  choices?: OpenAIChoice[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

function mapStopReason(finishReason: string | null | undefined): string | null {
  switch (finishReason) {
    case 'tool_calls':
    case 'function_call':
      return 'tool_use'
    case 'length':
      return 'max_tokens'
    case 'content_filter':
      return 'refusal'
    case 'stop':
    case null:
    case undefined:
      return 'end_turn'
    default:
      return 'end_turn'
  }
}

function emptyUsage(): JsonObject {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  }
}

function translateNonStreaming(
  data: OpenAIResponse,
  fallbackModel: string,
): JsonObject {
  const choice = data.choices?.[0]
  const message = choice?.message
  const content: JsonObject[] = []
  if (message?.reasoning_content) {
    content.push({ type: 'thinking', thinking: message.reasoning_content })
  }
  if (typeof message?.content === 'string' && message.content.length > 0) {
    content.push({ type: 'text', text: message.content })
  } else if (Array.isArray(message?.content)) {
    // Some gateways return structured parts
    for (const part of message.content as JsonObject[]) {
      if (part.type === 'text' && typeof part.text === 'string') {
        content.push({ type: 'text', text: part.text })
      }
    }
  }
  for (const toolCall of message?.tool_calls ?? []) {
    let input: unknown = {}
    try {
      input = toolCall.function?.arguments
        ? JSON.parse(toolCall.function.arguments)
        : {}
    } catch (error) {
      logForDebugging(
        `[openai-compat] tool arguments JSON.parse failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      input = {}
    }
    content.push({
      type: 'tool_use',
      id: toolCall.id ?? `toolu_${Math.random().toString(36).slice(2, 10)}`,
      name: toolCall.function?.name ?? '',
      input,
    })
  }
  return {
    id: data.id ?? 'msg_compat',
    type: 'message',
    role: 'assistant',
    model: data.model ?? fallbackModel,
    content,
    stop_reason: mapStopReason(choice?.finish_reason),
    stop_sequence: null,
    usage: {
      ...emptyUsage(),
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
  }
}

// ---------------------------------------------------------------------------
// Streaming translation (SSE -> BetaRawMessageStreamEvent sequence)
// ---------------------------------------------------------------------------

/**
 * Async-iterable stream of Anthropic raw stream events driven by an OpenAI
 * SSE response. `controller` aborts the underlying fetch — the app calls
 * stream.controller.abort() on timeouts/interrupts.
 */
function createEventStream(
  response: Response,
  fallbackModel: string,
  signal?: AbortSignal,
): AsyncIterable<JsonObject> & { controller: AbortController } {
  const controller = new AbortController()
  const abortFetch = () => response.body && response.body.cancel().catch(() => {})
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  controller.signal.addEventListener('abort', abortFetch, { once: true })

  const iterator = async function* (): AsyncGenerator<JsonObject> {
    if (!response.body) {
      yield {
        type: 'message_start',
        message: {
          id: 'msg_compat',
          type: 'message',
          role: 'assistant',
          model: fallbackModel,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: emptyUsage(),
        },
      }
      yield { type: 'message_stop' }
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let started = false
    // openai tool_call index -> anthropic content-block index
    const toolBlockByIndex = new Map<number, number>()
    let textBlockIndex: number | null = null
    let thinkingBlockIndex: number | null = null
    let nextBlockIndex = 0
    let stopReason: string | null = null
    let outputTokens = 0
    let inputTokens = 0

    const ensureBlockStart = function* (
      index: number,
      block: JsonObject,
    ): Generator<JsonObject> {
      yield { type: 'content_block_start', index, content_block: block }
    }

    const flushBlock = function* (index: number): Generator<JsonObject> {
      yield { type: 'content_block_stop', index }
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let newlineIdx = buffer.indexOf('\n')
        while (newlineIdx !== -1) {
          const line = buffer.slice(0, newlineIdx).trim()
          buffer = buffer.slice(newlineIdx + 1)
          newlineIdx = buffer.indexOf('\n')
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          let chunk: OpenAIResponse
          try {
            chunk = JSON.parse(payload) as OpenAIResponse
          } catch {
            continue
          }
          if (chunk.usage?.prompt_tokens !== undefined) {
            inputTokens = chunk.usage.prompt_tokens ?? inputTokens
          }
          if (chunk.usage?.completion_tokens !== undefined) {
            outputTokens = chunk.usage.completion_tokens ?? outputTokens
          }
          const choice = chunk.choices?.[0]
          if (!choice) continue
          if (!started) {
            // Emit message_start on the first choice-bearing chunk so usage
            // seen so far (many gateways send prompt_tokens on chunk #1)
            // lands in message_start.message.usage like Anthropic's does.
            started = true
            yield {
              type: 'message_start',
              message: {
                id: chunk.id ?? 'msg_compat',
                type: 'message',
                role: 'assistant',
                model: chunk.model ?? fallbackModel,
                content: [],
                stop_reason: null,
                stop_sequence: null,
                usage: { ...emptyUsage(), input_tokens: inputTokens },
              },
            }
          }
          const delta = choice.delta ?? {}
          // reasoning (DeepSeek R* / reasoning gateways) -> thinking block
          if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
            if (thinkingBlockIndex === null) {
              thinkingBlockIndex = nextBlockIndex++
              yield* ensureBlockStart(thinkingBlockIndex, { type: 'thinking', thinking: '' })
            }
            yield {
              type: 'content_block_delta',
              index: thinkingBlockIndex,
              delta: { type: 'thinking_delta', thinking: delta.reasoning_content },
            }
          }
          if (typeof delta.content === 'string' && delta.content) {
            if (textBlockIndex === null) {
              textBlockIndex = nextBlockIndex++
              yield* ensureBlockStart(textBlockIndex, { type: 'text', text: '' })
            }
            yield {
              type: 'content_block_delta',
              index: textBlockIndex,
              delta: { type: 'text_delta', text: delta.content },
            }
          }
          for (const toolCall of delta.tool_calls ?? []) {
            const openaiIndex = toolCall.index ?? 0
            let blockIndex = toolBlockByIndex.get(openaiIndex)
            if (blockIndex === undefined) {
              blockIndex = nextBlockIndex++
              toolBlockByIndex.set(openaiIndex, blockIndex)
              yield* ensureBlockStart(blockIndex, {
                type: 'tool_use',
                id: toolCall.id ?? `toolu_${openaiIndex}`,
                name: toolCall.function?.name ?? '',
                input: {},
              })
            }
            if (toolCall.function?.arguments) {
              yield {
                type: 'content_block_delta',
                index: blockIndex,
                delta: { type: 'input_json_delta', partial_json: toolCall.function.arguments },
              }
            }
          }
          if (choice.finish_reason) {
            stopReason = mapStopReason(choice.finish_reason)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (!started) {
      // Empty stream: emit a minimal valid sequence.
      yield messageStart
    }
    for (const index of [thinkingBlockIndex, textBlockIndex, ...toolBlockByIndex.values()]) {
      if (index !== null) {
        yield* flushBlock(index)
      }
    }
    yield {
      type: 'message_delta',
      delta: { stop_reason: stopReason ?? 'end_turn', stop_sequence: null },
      usage: { output_tokens: outputTokens },
    }
    yield {
      type: 'message_stop',
      message: { usage: { ...emptyUsage(), input_tokens: inputTokens, output_tokens: outputTokens } },
    }
  }

  return {
    [Symbol.asyncIterator]: () => iterator(),
    controller,
  }
}

// ---------------------------------------------------------------------------
// Client shim
// ---------------------------------------------------------------------------

export type OpenAiCompatClientOptions = {
  baseUrl: string
  apiKey: string
}

async function parseErrorResponse(
  response: Response,
  apiKey: string,
): Promise<never> {
  let body = ''
  try {
    body = await response.text()
  } catch {}
  const redacted = apiKey ? body.split(apiKey).join('<redacted>') : body
  const error = new Error(
    `${response.status} ${response.statusText} — ${redacted.slice(0, 400)}`,
  ) as Error & { status?: number }
  error.status = response.status
  throw error
}

/**
 * Build the shim. The return type is structurally compatible with the parts
 * of the Anthropic SDK client the app uses; client.ts casts it.
 */
export function createOpenAiCompatClient(options: OpenAiCompatClientOptions): unknown {
  const { baseUrl, apiKey } = options
  const url = chatCompletionsUrl(baseUrl)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }

  async function create(
    params: AnthropicCreateParams,
    requestOptions?: CreateOptions,
  ): Promise<unknown> {
    const stream = params.stream === true
    const body = buildChatBody(params, stream)
    const signal = requestOptions?.signal
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...headers, ...(requestOptions?.headers ?? {}) },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    })
    if (!response.ok) {
      await parseErrorResponse(response, apiKey)
    }
    if (!stream) {
      const data = (await response.json()) as OpenAIResponse
      return translateNonStreaming(data, params.model)
    }
    const eventStream = createEventStream(response, params.model, signal)
    return {
      data: eventStream,
      request_id: response.headers.get('x-request-id') ?? undefined,
      response,
      withResponse: async () => ({
        data: eventStream,
        request_id: response.headers.get('x-request-id') ?? undefined,
        response,
      }),
    }
  }

  return {
    beta: {
      messages: {
        create,
        countTokens: async (params: {
          messages?: unknown
          system?: unknown
          tools?: unknown
        }) => {
          // No OpenAI-equivalent endpoint — return a rough char-based
          // estimate so callers relying on counts degrade gracefully.
          const size = JSON.stringify(params ?? {}).length
          return { input_tokens: Math.max(1, Math.ceil(size / 3.6)) }
        },
      },
    },
    models: {
      list: () => ({
        async *[Symbol.asyncIterator]() {
          // Capability probing has no OpenAI equivalent — report nothing and
          // let callers fall back to defaults.
        },
      }),
    },
  }
}
