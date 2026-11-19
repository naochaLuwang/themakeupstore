import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  platform: 'android', listeners: {} as Record<string, (event: { url: string; canGoBack: boolean }) => void>,
  addListener: vi.fn(), remove: vi.fn(), getLaunchUrl: vi.fn(), exitApp: vi.fn(),
  push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), exchange: vi.fn(), toast: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => mocks.platform, isPluginAvailable: () => true } }))
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.addListener, getLaunchUrl: mocks.getLaunchUrl, exitApp: mocks.exitApp } }))
const router = { push: mocks.push, replace: mocks.replace, refresh: mocks.refresh }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('sonner', () => ({ toast: { error: mocks.toast } }))
vi.mock('@/utils/supabase/client', () => ({ createClient: () => ({ auth: { exchangeCodeForSession: mocks.exchange } }) }))
import AndroidAppRuntime from './AndroidAppRuntime'
let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
  vi.clearAllMocks(); mocks.platform = 'android'; mocks.listeners = {}
  mocks.addListener.mockImplementation(async (name, callback) => { mocks.listeners[name] = callback; return { remove: mocks.remove } })
  mocks.getLaunchUrl.mockResolvedValue({ url: 'https://themakeupstorewangkhei.com/products/cold?shade=1' })
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove(); vi.unstubAllGlobals()
  document.querySelector('meta[name="viewport"]')?.remove()
})
async function render() { await act(async () => root.render(<AndroidAppRuntime />)) }
describe('Android navigation lifecycle', () => {
  it('opens a cold-start destination, handles warm links, and cleans up', async () => {
    await render()
    expect(mocks.push).toHaveBeenCalledWith('/products/cold?shade=1')
    await act(async () => { mocks.listeners.appUrlOpen({ url: 'https://themakeupstorewangkhei.com/profile/orders/warm', canGoBack: true }) })
    expect(mocks.push).toHaveBeenCalledWith('/profile/orders/warm')
    await act(async () => root.unmount())
    root = createRoot(container)
    expect(mocks.remove).toHaveBeenCalledTimes(2)
    expect(document.documentElement.dataset.nativePlatform).toBeUndefined()
  })
  it.each(['ios', 'web'])('does not install Android handlers or change the viewport on %s', async platform => {
    mocks.platform = platform
    const viewport = document.createElement('meta'); viewport.name = 'viewport'
    viewport.content = 'width=device-width,maximum-scale=1,user-scalable=no'
    document.head.appendChild(viewport)
    await render()
    expect(mocks.addListener).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.nativePlatform).toBeUndefined()
    expect(viewport.content).toBe('width=device-width,maximum-scale=1,user-scalable=no')
  })
  it('allows Android zoom without retaining a changed viewport after unmount', async () => {
    const viewport = document.createElement('meta'); viewport.name = 'viewport'
    viewport.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover'
    document.head.appendChild(viewport)
    await render()
    expect(viewport.content).toBe('width=device-width,initial-scale=1,viewport-fit=cover')
    await act(async () => root.unmount()); root = createRoot(container)
    expect(viewport.content).toContain('user-scalable=no')
  })
  it('does not route a retained launch event a second time', async () => {
    mocks.getLaunchUrl.mockImplementation(async () => {
      const url = 'https://themakeupstorewangkhei.com/products/one'
      mocks.listeners.appUrlOpen({ url, canGoBack: false })
      return { url }
    })
    await render()
    expect(mocks.push).toHaveBeenCalledWith('/products/one')
    expect(mocks.push).toHaveBeenCalledTimes(1)
  })
})
