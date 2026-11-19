import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const action = process.argv[2] || 'sync'
if (!['sync', 'build', 'archive'].includes(action)) throw new Error('Use sync, build or archive')
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
run(process.execPath, [path.join(root, 'node_modules/@capacitor/cli/bin/capacitor'), 'sync', 'ios'])
if (action !== 'sync') {
  const derived = process.env.TMS_IOS_DERIVED_DATA || path.join(os.tmpdir(), 'tms-ios-build')
  const args = ['-project', 'ios/App/App.xcodeproj', '-scheme', 'App', '-derivedDataPath', derived, '-packageAuthorizationProvider', 'netrc']
  if (action === 'build') {
    args.push('-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator', `ARCHS=${os.arch() === 'arm64' ? 'arm64' : 'x86_64'}`, 'ONLY_ACTIVE_ARCH=YES', 'CODE_SIGNING_ALLOWED=NO', 'DEBUG_INFORMATION_FORMAT=dwarf', 'build')
  } else {
    const archive = process.env.TMS_IOS_ARCHIVE || path.join(mkdtempSync(path.join(os.tmpdir(), 'tms-ios-release-')), 'App.xcarchive')
    args.push('-configuration', 'Release', '-destination', 'generic/platform=iOS', '-archivePath', archive, 'archive')
  }
  // No automatic provisioning changes, export, upload or Android sync.
  run('xcodebuild', args)
}
