import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ platform: 'ios', listeners: {} as Record<string, (value: { url: string }) => void>, add: vi.fn(), remove: vi.fn(), launch: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), auth: vi.fn() }))
const router = { push: mocks.push, replace: mocks.replace, refresh: mocks.refresh }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => mocks.platform, isPluginAvailable: () => true } }))
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.add, getLaunchUrl: mocks.launch } }))
vi.mock('@/lib/ios-auth', () => ({ completeIOSAuth: mocks.auth }))
import IOSAppRuntime from './IOSAppRuntime'
let container: HTMLDivElement, root: Root
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); mocks.platform = 'ios'; mocks.listeners = {}
  mocks.add.mockImplementation(async (name, callback) => { mocks.listeners[name] = callback; return { remove: mocks.remove } })
  mocks.launch.mockResolvedValue({ url: 'https://themakeupstorewangkhei.com/products/cold' })
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals()
})
it('routes cold and warm iOS links and removes the listener on unmount', async () => {
  await act(async () => root.render(<IOSAppRuntime />))
  expect(mocks.push).toHaveBeenCalledWith('/products/cold')
  await act(async () => mocks.listeners.appUrlOpen({ url: 'https://themakeupstorewangkhei.com/profile/orders/warm' }))
  expect(mocks.push).toHaveBeenCalledWith('/profile/orders/warm')
  await act(async () => root.unmount()); root = createRoot(container)
  expect(mocks.remove).toHaveBeenCalledOnce(); expect(document.documentElement.dataset.nativePlatform).toBeUndefined()
})
it('rejects an external link and delegates valid auth returns to the shared coordinator', async () => {
  await act(async () => root.render(<IOSAppRuntime />))
  mocks.push.mockClear()
  await act(async () => mocks.listeners.appUrlOpen({ url: 'https://evil.test/products/1' }))
  expect(mocks.push).not.toHaveBeenCalled()
  await act(async () => mocks.listeners.appUrlOpen({ url: 'themakeupstore://auth/callback?code=private' }))
  expect(mocks.auth).toHaveBeenCalledWith('themakeupstore://auth/callback?code=private', expect.any(Object))
})
it.each(['android', 'web'])('does not install iOS handlers or change %s', async platform => {
  mocks.platform = platform
  await act(async () => root.render(<IOSAppRuntime />))
  expect(mocks.add).not.toHaveBeenCalled(); expect(document.documentElement.dataset.nativePlatform).toBeUndefined()
})
