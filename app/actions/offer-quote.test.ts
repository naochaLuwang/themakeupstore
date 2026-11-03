// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { getOfferQuote, getCheckoutQuote } from './offer-quote'
import { CartStockError } from '@/lib/cart-stock'
const mocks=vi.hoisted(()=>({quote:vi.fn(),db:{},user:null as {id:string}|null}))
vi.mock('@/utils/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:mocks.user}})}})}))
vi.mock('@/utils/supabase/admin',()=>({createAdminClient:async()=>mocks.db}))
vi.mock('@/lib/cart-quote',async importOriginal=>({...await importOriginal<typeof import('@/lib/cart-quote')>(),merchandiseQuote:mocks.quote}))
beforeEach(()=>{vi.clearAllMocks();mocks.user=null})
it('serializes authoritative stock failures for cart previews without changing them into successful quotes',async()=>{
  mocks.quote.mockRejectedValue(new CartStockError('Out of stock',[{variantId:'v',stock:0}]))
  expect(await getOfferQuote([{variantId:'v',quantity:3}])).toEqual({success:false,message:'Out of stock',stock:[{variantId:'v',stock:0}]})
})
it('does not invent stock values when verification fails for another reason',async()=>{
  mocks.quote.mockRejectedValue(new Error('Network unavailable'))
  expect(await getOfferQuote([{variantId:'v',quantity:3}])).toEqual({success:false,message:'Network unavailable'})
})
it('returns stock details to an authenticated checkout that fails its final stock check',async()=>{
  mocks.user={id:'customer'}
  mocks.quote.mockRejectedValue(new CartStockError('Out of stock',[{variantId:'v',stock:0}]))
  expect(await getCheckoutQuote([{variantId:'v',quantity:1}],{shippingMethodId:'shipping',pincode:'795001'})).toEqual({success:false,message:'Out of stock',stock:[{variantId:'v',stock:0}]})
})
