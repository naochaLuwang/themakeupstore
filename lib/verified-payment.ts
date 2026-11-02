import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import Razorpay from 'razorpay'
import type { checkoutQuote } from '@/lib/checkout-pricing'

export function paymentClient() {
  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new Error('Payment gateway is not configured')
  return new Razorpay({ key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
}
export function quoteFingerprint(quote: Awaited<ReturnType<typeof checkoutQuote>>, input: { shippingMethodId: string; pincode: string; promoCode?: string; giftCardCode?: string }) {
  return createHash('sha256').update(JSON.stringify({
    items: quote.items.map(i => [i.variantId, i.quantity, i.price]).sort(),
    free: quote.freeItems.map(i => [i.ruleId, i.variantId, i.giftProductId, i.quantity]).sort(),
    couponLines:quote.promoEligibleVariantIds,
    allocations: quote.discounts?.map(d=>[d.rule_id,d.variant_id,d.free_quantity,d.discount_amount]), campaigns:quote.promotions,
    pricing:quote.items.map(i=>[i.variantId,i.mrp,i.priceBreakdown]).sort(), bxgyAllocations:quote.bxgyAllocations,
    shipping: input.shippingMethodId, pincode: input.pincode,
    promo: input.promoCode?.toUpperCase() || null, gift: input.giftCardCode?.toUpperCase() || null,
    discounts: [quote.promoDiscount, quote.bxgyDiscount, quote.giftCardDiscount, quote.coinDiscount],
    total: quote.total,
  })).digest('hex')
}
export function requestFingerprint(value: unknown): string {
  const canonical = (item: unknown): unknown => Array.isArray(item) ? item.map(canonical)
    : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => [key, canonical(v)])) : item
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  if (!/^order_[a-zA-Z0-9]+$/.test(orderId) || !/^pay_[a-zA-Z0-9]+$/.test(paymentId) || !/^[a-f0-9]{64}$/i.test(signature)) throw new Error('Invalid payment confirmation')
  if (!process.env.RAZORPAY_KEY_SECRET) throw new Error('Payment gateway is not configured')
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest()
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new Error('Payment signature mismatch')
}
export async function verifyCapturedPayment(input: {
  orderId: string; paymentId: string; signature: string; userId: string
  amountPaise: number; purpose: 'checkout' | 'gift_card'; fingerprint: string
}) {
  verifyPaymentSignature(input.orderId, input.paymentId, input.signature)
  const client = paymentClient()
  const [payment, order] = await Promise.all([client.payments.fetch(input.paymentId), client.orders.fetch(input.orderId)])
  const notes = order.notes as Record<string, string> | undefined
  if (payment.order_id !== input.orderId || notes?.user_id !== input.userId || notes?.purpose !== input.purpose || notes?.fingerprint !== input.fingerprint) throw new Error('Payment does not belong to this purchase')
  if (payment.status !== 'captured' || payment.captured !== true || payment.currency !== 'INR' || order.currency !== 'INR') throw new Error('Payment has not been captured in INR')
  if (Number(payment.amount) !== input.amountPaise || Number(order.amount) !== input.amountPaise || Number(payment.amount_refunded || 0) !== 0) throw new Error('Payment amount does not match this purchase')
}

// Razorpay's normal-refund idempotency key survives timeouts and confirmation retries.
export async function refundPaymentOnce(paymentId:string,amount:number,key:string):Promise<string> {
  if(!/^pay_[a-zA-Z0-9]+$/.test(paymentId)||!Number.isSafeInteger(Math.round(amount*100))||amount<=0)throw new Error('Invalid refund amount or payment')
  if(!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)throw new Error('Payment gateway is not configured')
  const authorization=Buffer.from(`${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
  const response=await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`,{method:'POST',headers:{Authorization:`Basic ${authorization}`,'Content-Type':'application/json','X-Refund-Idempotency':key},
    body:JSON.stringify({amount:Math.round(amount*100),speed:'normal',notes:{refund_request_id:key}}),signal:AbortSignal.timeout(20000)})
  const result=await response.json()
  if(!response.ok||!result.id||result.status==='failed')throw new Error('Razorpay has not confirmed the refund. Retry the original request; its refund key is unchanged.')
  return result.id
}
