// Stub: AGENT.md utility functions, replaced with minimal no-ops
const emptyMap = () => new Map<string, string>()

export function getExternalAgentMdIncludes() {
  return Promise.resolve(emptyMap())
}

export function getMemoryFiles() {
  return Promise.resolve(emptyMap())
}

export function getMemoryFilesForNestedDirectory() {
  return Promise.resolve([])
}

export function getConditionalRulesForCwdLevelDirectory() {
  return Promise.resolve([])
}

export function getManagedAndUserConditionalRules() {
  return []
}

export function shouldShowAgentMdExternalIncludesWarning() {
  return false
}

export function clearMemoryFileCaches() {
  // no-op
}

export function resetGetMemoryFilesCache() {
  // no-op
}

export function filterInjectedMemoryFiles() {
  return []
}

export function getAgentMds() {
  return []
}

/** @deprecated AGENT.md external includes removed in API-only mode */
export function getAgentMd(_path: string) {
  return ''
}

export interface MemoryFileInfo {}
