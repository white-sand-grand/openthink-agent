/**
 * Browser prompt bridge placeholder.
 *
 * The OpenThink-in-Browser integration is disabled in this restored build
 * (see utils/openThinkInBrowser/setup.ts). Keep the hook available so the REPL
 * can load without making a browser/MCP connection when that feature is off.
 */
export function usePromptsFromOpenThinkInBrowser(
  _mcpClients: readonly unknown[],
  _permissionMode: unknown,
): void {
  // Intentionally empty while the browser integration is disabled.
}
