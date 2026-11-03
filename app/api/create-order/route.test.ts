// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { CartStockError } from '@/lib/cart-stock'
const mocks=vi.hoisted(()=>({quote:vi.fn(),create:vi.fn()}))
vi.mock('@/utils/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'customer'}}})}})}))
vi.mock('@/utils/supabase/admin',()=>({createAdminClient:async()=>({})}))
vi.mock('@/lib/checkout-pricing',()=>({checkoutQuote:mocks.quote}))
vi.mock('@/lib/verified-payment',()=>({paymentClient:()=>({orders:{create:mocks.create}}),quoteFingerprint:()=> 'fingerprint'}))
vi.mock('@/lib/rate-limit',()=>({rateLimit:()=>({check:()=>({success:true})})}))
beforeEach(()=>vi.clearAllMocks())
const request=()=>new NextRequest('https://store.example/api/create-order',{method:'POST',body:JSON.stringify({cartItems:[{variantId:'v',quantity:1}],shippingMethodId:'s',pincode:'795001',quoteFingerprint:'fingerprint'})})
it('returns current stock and creates no payment order when the last unit sells out after checkout preflight',async()=>{
  mocks.quote.mockRejectedValue(new CartStockError('Out of stock',[{variantId:'v',stock:0}]))
  const response=await POST(request())
  expect(response.status).toBe(409)
  expect(await response.json()).toEqual({error:'Out of stock',stock:[{variantId:'v',stock:0}]})
  expect(mocks.create).not.toHaveBeenCalled()
})
it('creates payment only after a valid quote',async()=>{
  mocks.quote.mockResolvedValue({total:100});mocks.create.mockResolvedValue({id:'order-test',amount:10000,currency:'INR'})
  expect((await POST(request())).status).toBe(200)
  expect(mocks.create).toHaveBeenCalledOnce()
})
