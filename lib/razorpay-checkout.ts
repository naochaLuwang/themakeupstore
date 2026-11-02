export interface PaymentConfirmation {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}
interface CheckoutOptions {
  key: string; order_id: string; amount: number; currency: string; name: string; description: string
  webview_intent?: boolean
  handler: (response: PaymentConfirmation) => void
  modal: { ondismiss: () => void }
}
type CheckoutConstructor = new (options: CheckoutOptions) => { open(): void }
let pending: Promise<CheckoutConstructor> | null = null
export function loadRazorpayCheckout(): Promise<CheckoutConstructor> {
  const current = (window as unknown as { Razorpay?: CheckoutConstructor }).Razorpay
  if (current) return Promise.resolve(current)
  if (pending) return pending
  pending = new Promise<CheckoutConstructor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => {
      const loaded = (window as unknown as { Razorpay?: CheckoutConstructor }).Razorpay
      if (loaded) resolve(loaded)
      else reject(new Error('Payment gateway could not be loaded'))
    }
    script.onerror = () => { script.remove(); reject(new Error('Payment gateway could not be loaded')) }
    document.body.appendChild(script)
  }).catch(error => { pending = null; throw error })
  return pending
}
