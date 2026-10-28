import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { NotificationSettings } from './NotificationSettings'

const push = vi.hoisted(() => ({
    native: true,
    getPushStatus: vi.fn(), registerForFCM: vi.fn(), disablePushForCurrentDevice: vi.fn(),
    success: vi.fn(), error: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => push.native } }))
vi.mock('@/lib/capacitor-push', () => push)
vi.mock('@capacitor/app', () => ({ App: { addListener: async () => ({ remove: async () => {} }) } }))
vi.mock('sonner', () => ({ toast: { success: push.success, error: push.error } }))

let container: HTMLDivElement
let root: Root
beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    push.native = true
    push.getPushStatus.mockResolvedValue({ state: 'enabled', message: 'Enabled on this device.' })
    push.registerForFCM.mockResolvedValue({ ok: true })
    push.disablePushForCurrentDevice.mockResolvedValue(undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
})
async function render() { await act(async () => root.render(<NotificationSettings />)) }
function button(label: string) {
    const target = [...container.querySelectorAll('button')].find(button => button.textContent?.includes(label))
    if (!target) throw new Error(`Button not found: ${label}`)
    return target
}

it('shows enabled status and lets the user disable notifications', async () => {
    await render()
    expect(container.textContent).toContain('Enabled')
    push.getPushStatus.mockResolvedValue({ state: 'disabled', message: 'Turned off on this device.' })
    await act(async () => button('Disable Notifications').click())
    expect(push.disablePushForCurrentDevice).toHaveBeenCalledOnce()
    expect(container.textContent).toContain('Disabled')
    expect(button('Enable Notifications').disabled).toBe(false)
})

it('lets the user explicitly enable a disabled device and verifies the new status', async () => {
    push.getPushStatus.mockResolvedValue({ state: 'disabled', message: 'Turned off.' })
    await render()
    push.getPushStatus.mockResolvedValue({ state: 'enabled', message: 'Enabled on this device.' })
    await act(async () => button('Enable Notifications').click())
    expect(push.registerForFCM).toHaveBeenCalledWith({ enable: true })
    expect(container.textContent).toContain('Enabled')
    expect(push.success).toHaveBeenCalledWith('Notifications enabled on this device')
})

it('shows permission denial without claiming that notifications were enabled', async () => {
    push.getPushStatus.mockResolvedValue({ state: 'blocked', message: 'Allow notifications in phone settings.' })
    push.registerForFCM.mockResolvedValue({ ok: false, reason: 'Permission denied in phone settings.' })
    await render()
    await act(async () => button('Enable Notifications').click())
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Permission denied')
    expect(push.success).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Disabled')
})

it('rechecks status when returning from phone settings without automatically enabling', async () => {
    push.getPushStatus.mockResolvedValue({ state: 'blocked', message: 'Disabled in phone settings.' })
    await render()
    push.getPushStatus.mockResolvedValue({ state: 'enabled', message: 'Enabled on this device.' })
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(container.textContent).toContain('Enabled')
    expect(push.registerForFCM).not.toHaveBeenCalled()
})

it('shows an unknown status when the check fails, with a retry control', async () => {
    push.getPushStatus.mockResolvedValue({ state: 'error', message: 'Unable to check status.' })
    await render()
    expect(container.textContent).toContain('Unable to check')
    expect(button('Enable Notifications').disabled).toBe(true)
    expect(button('Check again').disabled).toBe(false)
})

it('explains that browser users need the app, without calling native APIs', async () => {
    push.native = false
    await render()
    expect(container.textContent).toContain('App only')
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(push.getPushStatus).not.toHaveBeenCalled()
})
