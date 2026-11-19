import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const temp = mkdtempSync(path.join(os.tmpdir(), 'tms-ios-rules-'))
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status ?? result.signal ?? 'unknown status'}`)
}
const binary = path.join(temp, 'native-tests')
try {
  run('xcrun', ['swiftc', '-module-cache-path', path.join(temp, 'modules'), 'ios/App/App/StoreURLPolicy.swift', 'ios/NativeTests/main.swift', '-o', binary])
  run(binary, [])
} finally {
  rmSync(temp, { recursive: true, force: true })
}
