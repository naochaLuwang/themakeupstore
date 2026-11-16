import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CategoryStatusButton } from './category-status-button'

const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn(), toast: vi.fn() }))
vi.mock('@/app/actions/category-visibility', () => ({ setCategoryVisibility: mocks.save }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('sonner', () => ({ toast: { success: mocks.toast } }))
let container: HTMLDivElement, root: Root
beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    mocks.save.mockResolvedValue({ success: true, products: 6 })
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
})
function button(label: string) {
    const found = [...(document.querySelector('[role=alertdialog]') ?? document).querySelectorAll('button')].find(b => b.textContent?.trim() === label || b.getAttribute('aria-label') === label)
    if (!found) throw new Error(`Missing button ${label}`)
    return found
}
async function open(active = true) {
    await act(async () => root.render(<CategoryStatusButton id="cat" name="Makeup" active={active} />))
    await act(async () => button(`${active ? 'Deactivate' : 'Activate'} Makeup`).click())
}
it('requires confirmation, describes shared products, and cancels without a mutation', async () => {
    await open()
    expect(document.querySelector('[role=alertdialog]')).toHaveTextContent('including products listed in other categories')
    expect(mocks.save).not.toHaveBeenCalled()
    await act(async () => button('Cancel').click())
    expect(document.querySelector('[role=alertdialog]')).toBeNull()
    expect(mocks.save).not.toHaveBeenCalled()
})
it('deactivates once, disables repeat submissions and refreshes after success', async () => {
    let finish!: (value: unknown) => void
    mocks.save.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    await open()
    await act(async () => button('Deactivate').click())
    expect(button('Saving…')).toBeDisabled()
    expect(button('Cancel')).toBeDisabled()
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith('cat', false, true)
    await act(async () => finish({ success: true, products: 6 }))
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(mocks.toast).toHaveBeenCalledWith('Category deactivated · 6 products deactivated')
    expect(document.querySelector('[role=alertdialog]')).toBeNull()
})
it('keeps failures visible and never reports a successful update', async () => {
    mocks.save.mockResolvedValue({ error: 'Category changed. Refresh before trying again.' })
    await open()
    await act(async () => button('Deactivate').click())
    expect(document.querySelector('[role=alert]')).toHaveTextContent('Category changed')
    expect(document.querySelector('[role=alertdialog]')).not.toBeNull()
    expect(mocks.toast).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
})
it('makes the limited reactivation behavior explicit', async () => {
    await open(false)
    expect(document.querySelector('[role=alertdialog]')).toHaveTextContent('Products and subcategories stay inactive')
    await act(async () => button('Activate').click())
    expect(mocks.save).toHaveBeenCalledWith('cat', true, false)
})
