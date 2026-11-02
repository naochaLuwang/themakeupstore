// @vitest-environment node
import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { verifyCapturedPayment, verifyPaymentSignature } from './verified-payment'
const mock=vi.hoisted(()=>({ payment:vi.fn(),order:vi.fn() }))
vi.mock('razorpay',()=>({ default:class { payments={fetch:mock.payment}; orders={fetch:mock.order} } }))
const signature=()=>createHmac('sha256','test-secret').update('order_test|pay_test').digest('hex')
beforeEach(()=>{
  vi.stubEnv('RAZORPAY_KEY_SECRET','test-secret');vi.stubEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID','test-id')
  mock.payment.mockResolvedValue({order_id:'order_test',amount:50000,currency:'INR',status:'captured',captured:true,amount_refunded:0})
  mock.order.mockResolvedValue({amount:50000,currency:'INR',notes:{user_id:'customer',purpose:'gift_card',fingerprint:'purchase'}})
})
afterEach(()=>vi.unstubAllEnvs())
const confirm=()=>verifyCapturedPayment({orderId:'order_test',paymentId:'pay_test',signature:signature(),userId:'customer',amountPaise:50000,purpose:'gift_card',fingerprint:'purchase'})
it('accepts a captured payment bound to the current user and purchase',async()=>{await expect(confirm()).resolves.toBeUndefined()})
it('rejects a forged signature',()=>{expect(()=>verifyPaymentSignature('order_test','pay_test','0'.repeat(64))).toThrow('signature mismatch')})
it.each([
  {status:'authorized',captured:false,amount:50000,currency:'INR'},
  {status:'failed',captured:false,amount:50000,currency:'INR'},
  {status:'captured',captured:true,amount:49999,currency:'INR'},
  {status:'captured',captured:true,amount:50000,currency:'USD'},
  {status:'captured',captured:true,amount:50000,currency:'INR',amount_refunded:1},
])('rejects an unverified payment state %o',async payment=>{
  mock.payment.mockResolvedValue({order_id:'order_test',...payment});await expect(confirm()).rejects.toThrow()
})
it.each([
  {user_id:'someone-else',purpose:'gift_card',fingerprint:'purchase'},
  {user_id:'customer',purpose:'checkout',fingerprint:'purchase'},
  {user_id:'customer',purpose:'gift_card',fingerprint:'other-purchase'},
])('rejects payment ownership/purpose/context mismatch %o',async notes=>{
  mock.order.mockResolvedValue({amount:50000,currency:'INR',notes});await expect(confirm()).rejects.toThrow('does not belong')
})
