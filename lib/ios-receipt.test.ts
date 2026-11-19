import { beforeEach, expect, it, vi } from 'vitest'
const native = vi.hoisted(() => ({ write: vi.fn(), share: vi.fn() }))
vi.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Filesystem: { writeFile: native.write } }))
vi.mock('@capacitor/share', () => ({ Share: { share: native.share } }))
import { shareIOSReceipt } from './ios-receipt'
beforeEach(() => vi.resetAllMocks())
it('shares the real iOS cache file URI', async () => {
  native.write.mockResolvedValue({ uri: 'file:///app/Library/Caches/receipts/Receipt-123.pdf' })
  await shareIOSReceipt('Receipt-123.pdf', 'PDF')
  expect(native.write).toHaveBeenCalledWith({ path: 'receipts/Receipt-123.pdf', data: 'PDF', directory: 'CACHE', recursive: true })
  expect(native.share.mock.calls[0][0].files).toEqual(['file:///app/Library/Caches/receipts/Receipt-123.pdf'])
})
it('never shares after a failed write', async () => {
  native.write.mockRejectedValue(new Error('disk full'))
  await expect(shareIOSReceipt('Receipt-123.pdf', 'PDF')).rejects.toThrow('disk full')
  expect(native.share).not.toHaveBeenCalled()
})
it('rejects an escaping receipt filename', async () => {
  await expect(shareIOSReceipt('../private.pdf', 'PDF')).rejects.toThrow('Invalid receipt filename')
  expect(native.write).not.toHaveBeenCalled()
})
