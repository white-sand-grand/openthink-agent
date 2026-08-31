import pkg from '../package.json'
import { execFileSync } from 'child_process'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, extname, join, resolve } from 'path'

type MacroConfig = {
  VERSION: string
  BUILD_TIME: string
  PACKAGE_URL: string
  NATIVE_PACKAGE_URL: string
  VERSION_CHANGELOG: string
  ISSUES_EXPLAINER: string
  FEEDBACK_CHANNEL: string
}

const defaultMacro: MacroConfig = {
  VERSION: pkg.version,
  BUILD_TIME: '',
  PACKAGE_URL: pkg.name,
  NATIVE_PACKAGE_URL: pkg.name,
  VERSION_CHANGELOG: '',
  ISSUES_EXPLAINER:
    'file an issue at https://github.com/white-sand-grand/openthink-agent/issues',
  FEEDBACK_CHANNEL: 'github',
}

if (!('MACRO' in globalThis)) {
  ;(globalThis as typeof globalThis & { MACRO: MacroConfig }).MACRO =
    defaultMacro
}

type MissingImport = {
  importer: string
  specifier: string
}

function scanFiles(dir: string, out: string[]): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      scanFiles(fullPath, out)
      continue
    }
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(extname(entry.name))) {
      out.push(fullPath)
    }
  }
}

function hasResolvableTarget(basePath: string): boolean {
  const withoutJs = basePath.replace(/\.js$/u, '')
  const candidates = [
    withoutJs,
    `${withoutJs}.ts`,
    `${withoutJs}.tsx`,
    `${withoutJs}.js`,
    `${withoutJs}.jsx`,
    `${withoutJs}.mjs`,
    `${withoutJs}.cjs`,
    join(withoutJs, 'index.ts'),
    join(withoutJs, 'index.tsx'),
    join(withoutJs, 'index.js'),
  ]
  return candidates.some(candidate => existsSync(candidate))
}

function collectMissingRelativeImports(): MissingImport[] {
  const files: string[] = []
  scanFiles(resolve('src'), files)
  scanFiles(resolve('vendor'), files)
  const missing: MissingImport[] = []
  const seen = new Set<string>()
  const pattern =
    /(?:import|export)\s+[\s\S]{0,2000}?from\s+['"](\.\.?\/[^'"]+)['"]|require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g

  for (const file of files) {
    // Generated React files can contain multi-megabyte source-map comments.
    // Never let the import matcher traverse those lines: an unbounded
    // cross-line expression makes --help/--version appear to hang.
    const text = readFileSync(file, 'utf8').replace(/^\/\/# sourceMappingURL=.*$/gmu, '')
    for (const match of text.matchAll(pattern)) {
      const specifier = match[1] ?? match[2]
      if (!specifier) continue
      const target = resolve(dirname(file), specifier)
      if (hasResolvableTarget(target)) continue
      const key = `${file} -> ${specifier}`
      if (seen.has(key)) continue
      seen.add(key)
      missing.push({
        importer: file,
        specifier,
      })
    }
  }

  return missing.sort((a, b) =>
    `${a.importer}:${a.specifier}`.localeCompare(`${b.importer}:${b.specifier}`),
  )
}

const args = process.argv.slice(2)
const scanStartedAt = Date.now()
if (process.stderr.isTTY) {
  process.stderr.write('OpenThink: checking source tree for missing imports...\n')
}
const missingImports = collectMissingRelativeImports()
if (process.stderr.isTTY) {
  process.stderr.write(`OpenThink: source check complete (${((Date.now() - scanStartedAt) / 1000).toFixed(1)}s)\n`)
}

if (args.includes('--version')) {
  if (missingImports.length > 0) {
    console.log(`${pkg.version} (restored dev workspace)`)
    console.log(`missing_relative_imports=${missingImports.length}`)
    process.exit(0)
  }
  console.log(pkg.version)
  process.exit(0)
}

if (args.includes('--help')) {
  if (missingImports.length > 0) {
    console.log('OpenThink development workspace')
    console.log(`version: ${pkg.version}`)
    console.log(`missing relative imports: ${missingImports.length}`)
    process.exit(0)
  }
  console.log('Usage: openthink [options] [prompt]')
  console.log('')
  console.log('Basic restored commands:')
  console.log('  --help       Show this help')
  console.log('  --version    Show version')
  console.log('')
  console.log('Interactive REPL startup is routed to src/main.tsx when run without these flags.')
  process.exit(0)
}

if (args.includes('--check-imports')) {
  if (missingImports.length > 0) {
    console.error(`missing relative imports: ${missingImports.length}`)
    for (const item of missingImports) {
      console.error(`- ${item.importer.replace(`${process.cwd()}/`, '')} -> ${item.specifier}`)
    }
    process.exit(1)
  }
  console.log('missing relative imports: 0')
  process.exit(0)
}

if (missingImports.length > 0) {
  console.log('OpenThink development workspace')
  console.log(`version: ${pkg.version}`)
  console.log(`missing relative imports: ${missingImports.length}`)
  console.log('')
  console.log('Top missing modules:')
  for (const item of missingImports.slice(0, 20)) {
    console.log(`- ${item.importer.replace(`${process.cwd()}/`, '')} -> ${item.specifier}`)
  }
  console.log('')
  console.log('The original app entry is still blocked by missing restored sources.')
  console.log('Use this workspace to continue restoration; once missing imports reach 0, this launcher will forward to src/main.tsx automatically.')
  process.exit(0)
}

// WSL terminals launched through some desktop PTYs report an impossible
// 131072x1 size. Ink then renders an effectively invisible screen. Repair
// only clearly invalid dimensions and leave normal terminals untouched.
if (
  process.stdout.isTTY &&
  ((process.stdout.columns ?? 0) > 1000 || (process.stdout.rows ?? 0) < 2)
) {
  try {
    execFileSync('stty', ['rows', '40', 'cols', '120'], {
      stdio: ['/dev/tty', 'ignore', 'ignore'],
    })
  } catch {
    // Some embedded terminals do not expose /dev/tty; the app can still run.
  }
}

// Route through the original CLI bootstrap so the exported `main()` is
// actually invoked. Importing `main.tsx` directly only evaluates the module.
if (process.stderr.isTTY) process.stderr.write('OpenThink: loading CLI...\n')
await import('./entrypoints/cli.tsx')
if (process.stderr.isTTY) process.stderr.write('OpenThink: CLI loaded.\n')
