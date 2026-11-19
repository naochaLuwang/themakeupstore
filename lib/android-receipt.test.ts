import { describe, it, expect, vi, beforeEach } from 'vitest'
const native = vi.hoisted(() => ({ writeFile: vi.fn(), share: vi.fn() }))
vi.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Filesystem: { writeFile: native.writeFile } }))
vi.mock('@capacitor/share', () => ({ Share: { share: native.share } }))
import { shareAndroidReceipt } from './android-receipt'
beforeEach(() => { vi.resetAllMocks() })
describe('Android PDF sharing', () => {
  it('shares the actual private cache URI rather than a fabricated filename URL', async () => {
    native.writeFile.mockResolvedValue({ uri: 'file:///data/user/0/store/cache/receipts/Receipt-123.pdf' })
    await shareAndroidReceipt('Receipt-123.pdf', 'PDFBASE64')
    expect(native.writeFile).toHaveBeenCalledWith({ path: 'receipts/Receipt-123.pdf', data: 'PDFBASE64', directory: 'CACHE', recursive: true })
    expect(native.share).toHaveBeenCalledWith({ title: 'Receipt-123.pdf', files: ['file:///data/user/0/store/cache/receipts/Receipt-123.pdf'], dialogTitle: 'Save or share receipt' })
  })
  it('does not share a nonexistent file after a write failure', async () => {
    native.writeFile.mockRejectedValue(new Error('disk full'))
    await expect(shareAndroidReceipt('Receipt-123.pdf', 'PDF')).rejects.toThrow('disk full')
    expect(native.share).not.toHaveBeenCalled()
  })
  it('rejects a filename that escapes the receipt directory', async () => {
    await expect(shareAndroidReceipt('../private.pdf', 'PDF')).rejects.toThrow('Invalid receipt filename')
    expect(native.writeFile).not.toHaveBeenCalled()
  })
})
