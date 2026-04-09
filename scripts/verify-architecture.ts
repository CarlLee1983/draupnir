#!/usr/bin/env bun

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

interface ModuleCheck {
  name: string
  hasStructure: boolean
  missingLayers: string[]
  fileCount: number
  largeFiles: Array<{ file: string; lines: number }>
  issues: string[]
}

const MODULES_DIR = path.join(process.cwd(), 'src/Modules')
const EXPECTED_LAYERS = ['Domain', 'Application', 'Infrastructure', 'Presentation']
const LINE_LIMIT = 500
const FILE_LIMIT = 800

function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content.split('\n').length
  } catch {
    return 0
  }
}

function walkDir(dir: string): string[] {
  let files: string[] = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files = files.concat(walkDir(fullPath))
      } else if (entry.name.endsWith('.ts')) {
        files.push(fullPath)
      }
    }
  } catch {
    // ignore
  }
  return files
}

function analyzeModule(moduleName: string): ModuleCheck {
  const moduleDir = path.join(MODULES_DIR, moduleName)
  const check: ModuleCheck = {
    name: moduleName,
    hasStructure: true,
    missingLayers: [],
    fileCount: 0,
    largeFiles: [],
    issues: [],
  }

  // Check for required layers
  for (const layer of EXPECTED_LAYERS) {
    const layerPath = path.join(moduleDir, layer)
    if (!fs.existsSync(layerPath)) {
      check.missingLayers.push(layer)
      check.hasStructure = false
    }
  }

  // Count files and find large files
  const files = walkDir(moduleDir)
  check.fileCount = files.length

  for (const file of files) {
    const lines = countLines(file)
    if (lines > LINE_LIMIT) {
      check.largeFiles.push({
        file: path.relative(moduleDir, file),
        lines,
      })
    }
  }

  // Check for index.ts (barrel export)
  const indexPath = path.join(moduleDir, 'index.ts')
  if (!fs.existsSync(indexPath)) {
    check.issues.push('Missing index.ts barrel export')
  }

  return check
}

function checkTypeScriptStrict(): boolean {
  try {
    execSync('bun run typecheck', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function checkLint(): boolean {
  try {
    execSync('bun run lint', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log('🔍 Draupnir Architecture Verification\n')
  console.log('=' .repeat(60))

  // 1. Basic checks
  console.log('\n📋 BASIC QUALITY CHECKS')
  console.log('-'.repeat(60))

  const tsStrict = checkTypeScriptStrict()
  console.log(`TypeScript Strict Mode: ${tsStrict ? '✅ PASS' : '❌ FAIL'}`)

  const lintPass = checkLint()
  console.log(`Biome Lint: ${lintPass ? '✅ PASS' : '❌ FAIL'}`)

  // 2. Module structure analysis
  console.log('\n📦 MODULE STRUCTURE ANALYSIS')
  console.log('-'.repeat(60))

  const modules = fs.readdirSync(MODULES_DIR).filter(name => {
    const stat = fs.statSync(path.join(MODULES_DIR, name))
    return stat.isDirectory() && !name.startsWith('.')
  })

  const checks: ModuleCheck[] = []
  for (const module of modules) {
    const check = analyzeModule(module)
    checks.push(check)
  }

  // Summary table
  console.log('\nModule Structure Summary:')
  console.log(
    '| Module | Layers | Files | Issues |'
  )
  console.log('|--------|--------|-------|--------|')

  for (const check of checks) {
    const status = check.hasStructure ? '✅' : '⚠️'
    const issues = [
      ...check.missingLayers.map(l => `Missing ${l}`),
      ...check.largeFiles.map(f => `${f.file} (${f.lines}L)`),
      ...check.issues,
    ]
    const issueStr = issues.length === 0 ? '✅' : issues.length.toString()
    console.log(
      `| ${check.name} | ${status} ${EXPECTED_LAYERS.length - check.missingLayers.length}/${EXPECTED_LAYERS.length} | ${check.fileCount} | ${issueStr} |`
    )
  }

  // 3. Large files warning
  console.log('\n📊 FILES ANALYSIS')
  console.log('-'.repeat(60))

  const allLargeFiles = checks.flatMap(c => c.largeFiles.map(f => ({ module: c.name, ...f })))
  if (allLargeFiles.length > 0) {
    console.log('\n⚠️  Large files (>500 lines):')
    for (const { module, file, lines } of allLargeFiles) {
      console.log(`  ${module}/${file}: ${lines} lines`)
    }
  } else {
    console.log('\n✅ All files are within size limits')
  }

  // 4. Module issues
  console.log('\n🔴 MODULE ISSUES')
  console.log('-'.repeat(60))

  const allIssues = checks.flatMap(c =>
    [...c.missingLayers.map(l => ({ module: c.name, issue: `Missing layer: ${l}` })), ...c.issues.map(i => ({ module: c.name, issue: i }))]
  )

  if (allIssues.length > 0) {
    for (const { module, issue } of allIssues) {
      console.log(`  ❌ ${module}: ${issue}`)
    }
  } else {
    console.log('\n✅ No structural issues detected')
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\nTotal modules analyzed: ${modules.length}`)
  console.log(`Modules with complete structure: ${checks.filter(c => c.hasStructure).length}/${modules.length}`)
}

main().catch(console.error)
