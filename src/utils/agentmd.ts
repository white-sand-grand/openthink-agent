// API-only stub: AGENT.md discovery is disabled, but shared diagnostics and
// attachment code still need the runtime data contract exported by this module.
export const MAX_MEMORY_CHARACTER_COUNT = 40_000

export type MemoryFileType = 'User' | 'Project' | 'Local' | 'Managed' | string

export interface MemoryFileInfo {
  path: string
  type: MemoryFileType
  content: string
  parent?: string
  rawContent?: string
  contentDiffersFromDisk?: boolean
}

const EMPTY_MEMORY_FILES = Promise.resolve([] as MemoryFileInfo[])
const EMPTY_EXTERNAL_INCLUDES = new Map<string, string>()

export function getExternalAgentMdIncludes(_memoryFiles?: MemoryFileInfo[]) {
  return EMPTY_EXTERNAL_INCLUDES
}

export function getMemoryFiles(_includeExternal = false) {
  return EMPTY_MEMORY_FILES
}

export function getMemoryFilesForNestedDirectory(
  _dir?: string,
  _filePath?: string,
  _processedPaths?: Set<string>,
): Promise<MemoryFileInfo[]> {
  return Promise.resolve([] as MemoryFileInfo[])
}

export function getConditionalRulesForCwdLevelDirectory(
  _dir?: string,
  _filePath?: string,
  _processedPaths?: Set<string>,
): Promise<MemoryFileInfo[]> {
  return Promise.resolve([] as MemoryFileInfo[])
}

export function getManagedAndUserConditionalRules(
  _filePath?: string,
  _processedPaths?: Set<string>,
): Promise<MemoryFileInfo[]> {
  return Promise.resolve([] as MemoryFileInfo[])
}

export function shouldShowAgentMdExternalIncludesWarning() {
  return false
}

export function hasExternalAgentMdIncludes() {
  return false
}

export function clearMemoryFileCaches() {
  // no-op
}

export function resetGetMemoryFilesCache() {
  // no-op
}

export function filterInjectedMemoryFiles(
  memoryFiles: MemoryFileInfo[] = [],
): MemoryFileInfo[] {
  return memoryFiles
}

export function getAgentMds(_memoryFiles: MemoryFileInfo[] = []): string {
  return ''
}

export function getLargeMemoryFiles(memoryFiles: MemoryFileInfo[]): MemoryFileInfo[] {
  return memoryFiles.filter(file => file.content.length > MAX_MEMORY_CHARACTER_COUNT)
}

/** @deprecated AGENT.md external includes removed in API-only mode */
export function getAgentMd(_path: string) {
  return ''
}
