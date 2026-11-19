export { parseNativeAppLink as parseAndroidAppLink, createNativeLinkHandler as createAndroidLinkHandler } from './native-app-links'
export type { NativeAppLink as AndroidAppLink } from './native-app-links'

// Android Back should dismiss the current layer before changing the page.
export function handleAndroidBack(canGoBack: boolean, goBack: () => void, exit: () => void, documentRoot: Document = document) {
  const payment = documentRoot.querySelector<HTMLElement>('.razorpay-container')
  if (payment && payment.style.display !== 'none' && !payment.hidden) return
  const layer = documentRoot.querySelector('[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"]')
  if (layer) {
    layer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }))
    return
  }
  if (canGoBack) goBack()
  else exit()
}
