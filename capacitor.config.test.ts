import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { CapacitorConfig } from '@capacitor/cli'

const originalArgs = process.argv
afterEach(() => { process.argv = originalArgs; vi.resetModules() })
async function load(platform?: string): Promise<CapacitorConfig> {
  process.argv = ['node', 'capacitor', 'sync', ...(platform ? [platform] : [])]
  vi.resetModules()
  return (await import('./capacitor.config')).default
}
describe('platform-specific Capacitor packaging', () => {
  it('packages Android recovery assets and keeps navigation inside the store origin', async () => {
    const config = await load('android')
    expect(config.server?.url).toBe('https://themakeupstorewangkhei.com')
    expect(config.server?.allowNavigation).toEqual([])
    expect(config.server?.hostname).toBe('localhost')
    expect(config.server?.cleartext).toBe(false)
    expect(config.server?.errorPath).toBe('offline.html')
    expect(config.zoomEnabled).toBe(true)
    expect(config.plugins?.SplashScreen?.launchShowDuration).toBe(0)
    expect(config.plugins?.StatusBar?.style).toBe('DEFAULT')
    expect(existsSync(path.join(config.webDir!, 'index.html'))).toBe(true)
    expect(existsSync(path.join(config.webDir!, config.server!.errorPath!))).toBe(true)
  })
  it('packages iOS independently with native recovery and only its supported plugins', async () => {
    const config = await load('ios')
    expect(config.webDir).toBe('native/ios')
    expect(config.server?.hostname).toBe('localhost')
    expect(config.server?.url).toBe('https://themakeupstorewangkhei.com')
    expect(config.server?.allowNavigation).toEqual([])
    expect(config.server?.errorPath).toBe('offline.html')
    expect(config.plugins?.SplashScreen?.launchShowDuration).toBe(0)
    expect(config.plugins?.StatusBar?.style).toBe('LIGHT')
    expect(config.ios?.includePlugins).toContain('@capacitor-firebase/messaging')
    expect(config.ios?.includePlugins).not.toContain('capacitor-native-google-one-tap-signin')
    expect(config.ios?.includePlugins).not.toContain('capacitor-razorpay')
    expect(existsSync(path.join(config.webDir!, 'index.html'))).toBe(true)
  })
  it('associates iOS links with the existing team and bundle without claiming API/build endpoints', () => {
    const association = JSON.parse(readFileSync('public/.well-known/apple-app-site-association', 'utf8'))
    const detail = association.applinks.details[0]
    expect(detail.appIDs).toEqual(['VJ6CZ336M8.com.themakeupstorewangkhei.twa'])
    expect(detail.components).toEqual([
      { '/': '/api/*', exclude: true },
      { '/': '/_next/*', exclude: true },
      { '/': '/.well-known/*', exclude: true },
      { '/': '/*' },
    ])
  })
  it('rejects ambiguous syncs that could overwrite the other platform', async () => {
    await expect(load()).rejects.toThrow('Select a platform')
  })
})
