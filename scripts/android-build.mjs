import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const action = process.argv[2] || 'sync'
if (!['sync', 'debug', 'release', 'test'].includes(action)) throw new Error('Use sync, debug, release or test')
const env = { ...process.env }
const localJdk = '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home'
if (!env.JAVA_HOME && existsSync(localJdk)) env.JAVA_HOME = localJdk
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
// Does not build, copy or delete any Next.js output, and never syncs iOS.
run(process.execPath, [path.join(root, 'node_modules/@capacitor/cli/bin/capacitor'), 'sync', 'android'])
if (action !== 'sync') {
  const task = { debug: 'assembleDebug', release: 'bundleRelease', test: 'testDebugUnitTest' }[action]
  run('./gradlew', [task, '--console=plain'], path.join(root, 'android'))
}
