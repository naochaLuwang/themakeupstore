import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import CheckoutClient from './checkout-client'
import { useCart, type CartItem } from '@/components/store/use-cart'
import { evaluatePromotionSnapshot, type PromotionSnapshot } from '@/lib/promotion-preview'

const mocks=vi.hoisted(()=>({checkout:vi.fn(),place:vi.fn(),push:vi.fn(),fetch:vi.fn(),info:vi.fn(),error:vi.fn(),gift:vi.fn()}))
vi.mock('@/app/actions/offer-quote',()=>({getCheckoutQuote:mocks.checkout}))
vi.mock('@/app/actions/orders',()=>({placeOrder:mocks.place}))
vi.mock('@/app/actions/promo',()=>({validatePromoCode:vi.fn()}))
vi.mock('@/app/actions/gift-cards',()=>({validateGiftCard:mocks.gift}))
vi.mock('@/app/actions/loyalty',()=>({getAvailableBalance:async()=>100}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push})}))
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:mocks.error,info:mocks.info}}))
vi.mock('@/components/store/address-form',()=>({AddressForm:()=>null}))
vi.mock('@/utils/supabase/client',()=>({createClient:()=>({
  auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})},
  from:()=>({select:()=>({eq:async()=>({data:[{id:'zone',shipping_methods:[{id:'ship',name:'Delivery',price:50,delivery_time_label:'Tomorrow'}]}],error:null})})}),
})}))
const address={id:'address',is_default:true,full_name:'Test Customer',phone:'0000000000',street:'Test street',city:'Imphal',state:'Manipur',pincode:'795001'}
const item=(variantId='dior',price=1500):CartItem=>({id:variantId,productId:variantId,variantId,name:variantId==='dior'?'Dior Rouge Blush':'Milani Lipstick',variantTitle:'Rose',
  price,mrp:price,originalPrice:price,quantity:1,stock:5,brand:'Brand',categoryId:'cat',categoryIds:['cat'],image:'/p.jpg'})
function catalog():PromotionSnapshot{return {ownerId:'customer',bxgyRules:[],giftRules:[],giftOptions:[],usedBXGY:[],usedGifts:[],expiresAt:Date.now()+30000}}
function quote(items=useCart.getState().items){
  const snapshot=catalog(),merchandise=evaluatePromotionSnapshot(items.filter(i=>!i.is_gift&&!i.is_bxgy_free).map(i=>({...i,brand:i.brand||'',categoryIds:i.categoryIds||[]})),snapshot)
  const shippingPrice=merchandise.subtotal>=3000?0:50
  return {...merchandise,previewCatalog:snapshot,shippingBasePrice:50,shippingPrice,shippingLabel:'Delivery',deliveryTimeLabel:'Tomorrow',promoDiscount:0,promoId:null,
    promoEligibleVariantIds:[],giftCardDiscount:0,coinDiscount:0,total:merchandise.subtotal-merchandise.bxgyDiscount+shippingPrice}
}
const result=()=>({success:true,quote:quote(),fingerprint:'fingerprint'})
let root:Root,container:HTMLDivElement
beforeEach(()=>{
  vi.useFakeTimers();vi.clearAllMocks();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('fetch',mocks.fetch);sessionStorage.clear()
  useCart.getState().clearCart();useCart.setState({offerCatalog:null});useCart.getState().applyOfferQuote(quote([item(),item('milani',1600)]))
  useCart.getState().setShippingMethod({id:'ship',name:'Delivery',price:50,delivery_time_label:'Tomorrow'});useCart.getState().setShippingPincode('795001')
  mocks.checkout.mockImplementation(async()=>result());mocks.place.mockResolvedValue({success:true,orderId:'placed'})
  mocks.fetch.mockImplementation(async()=>({ok:true,json:async()=>result()}))
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container)
})
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();vi.useRealTimers();sessionStorage.clear()})
async function render(){await act(async()=>root.render(<CheckoutClient profile={{id:'customer',email:'test@example.invalid'}} initialAddresses={[address]}/>))}
async function settle(ms=0){await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
function button(label:string){const found=[...container.querySelectorAll('button')].find(b=>b.textContent?.includes(label)||b.getAttribute('aria-label')?.includes(label));if(!found)throw Error('Missing button '+label);return found}
async function soldOut(){await act(async()=>useCart.getState().applyCartStock([{variantId:'dior',stock:0},{variantId:'milani',stock:5}],'Dior Rouge Blush is out of stock. Please remove it.'))}

it('marks a product that sells out while checkout is open and blocks new payment',async()=>{
  await render();await soldOut()
  const row=container.querySelector('[data-checkout-variant="dior"]')!
  expect(row).toHaveTextContent('Just sold out');expect(button('Update items to continue')).toBeDisabled()
  expect(button('Remove item: Dior Rouge Blush')).toBeEnabled()
  expect(container.textContent).not.toContain('Dior Rouge Blush is out of stock. Please remove it.')
  expect(mocks.checkout).not.toHaveBeenCalled();expect(mocks.place).not.toHaveBeenCalled()
})
it('removes the unavailable item in checkout, retains address/payment choices and requires review of new shipping and total',async()=>{
  await render()
  await act(async()=>button('Cash on Delivery').click())
  await soldOut()
  await act(async()=>button('Remove item: Dior Rouge Blush').click());await settle(120)
  expect(container.querySelector('[data-checkout-variant="dior"]')).toBeNull()
  expect(container.textContent).toContain('Test Customer');expect(container.textContent).toContain('Test street')
  expect(button('Review updated total')).toBeDisabled()
  expect(button('Confirm updated total')).toHaveTextContent('1,650')
  await act(async()=>button('Confirm updated total').click())
  expect(button('Place Order • COD')).toBeEnabled()
  expect(mocks.checkout).toHaveBeenCalledOnce();expect(mocks.place).not.toHaveBeenCalled()
  await act(async()=>button('Place Order • COD').click())
  expect(mocks.place).toHaveBeenCalledOnce()
  expect(mocks.place.mock.calls[0][0]).toEqual(address)
  expect(mocks.place.mock.calls[0][1].map((i:CartItem)=>i.variantId)).toEqual(['milani'])
})
it('offers a quantity correction when fewer units remain',async()=>{
  const items=[{...item(),quantity:3},item('milani',1600)]
  useCart.getState().applyOfferQuote(quote(items))
  await render()
  await act(async()=>useCart.getState().applyCartStock([{variantId:'dior',stock:2}],'Only 2 available'))
  expect(container.querySelector('[data-checkout-variant="dior"]')).toHaveTextContent('Only 2 available')
  await act(async()=>button('Use 2').click());await settle(120)
  expect(useCart.getState().items[0].quantity).toBe(2)
  expect(button('Review updated total')).toBeDisabled()
  await act(async()=>button('Confirm updated total').click())
  expect(button('Pay ₹')).toBeEnabled()
})
it('updates the affected row when stock fails the final checkout quote, without starting payment',async()=>{
  await render()
  mocks.checkout.mockResolvedValue({success:false,message:'Out of stock',stock:[{variantId:'dior',stock:0}]})
  await act(async()=>button('Pay ₹').click())
  expect(container.querySelector('[data-checkout-variant="dior"]')).toHaveTextContent('Just sold out')
  expect(button('Update items to continue')).toBeDisabled()
  expect(mocks.fetch).not.toHaveBeenCalled();expect(mocks.place).not.toHaveBeenCalled()
})
it('handles stock disappearing at payment-order creation without opening the gateway',async()=>{
  await render()
  mocks.fetch.mockResolvedValue({ok:false,json:async()=>({error:'Out of stock',stock:[{variantId:'dior',stock:0}]})})
  await act(async()=>button('Pay ₹').click())
  expect(mocks.fetch).toHaveBeenCalledWith('/api/create-order',expect.anything())
  expect(container.querySelector('[data-checkout-variant="dior"]')).toHaveTextContent('Just sold out')
  expect(button('Update items to continue')).toBeDisabled();expect(mocks.place).not.toHaveBeenCalled()
})
it('shows an empty-bag recovery if the last paid item is removed',async()=>{
  useCart.getState().applyOfferQuote(quote([item()]))
  await render();await soldOut()
  await act(async()=>button('Remove item: Dior Rouge Blush').click())
  expect(container.textContent).toContain('Your bag is empty')
  expect(button('Add items to continue')).toBeDisabled()
  await act(async()=>button('Continue shopping').click())
  expect(mocks.push).toHaveBeenCalledWith('/shop')
})
it('keeps captured-payment confirmation retryable and prevents removing items from that paid attempt',async()=>{
  const args=Array.from({length:10},()=>null)
  sessionStorage.setItem('checkout-payment-confirmation:customer',JSON.stringify({userId:'customer',args}))
  await render();await soldOut()
  expect([...container.querySelectorAll('button')].some(b=>b.textContent?.includes('Remove item'))).toBe(false)
  expect(button('Confirm Paid Order')).toBeEnabled()
  await act(async()=>button('Confirm Paid Order').click())
  expect(mocks.place).toHaveBeenCalledWith(...args)
  expect(mocks.push).toHaveBeenCalledWith('/checkout/success?orderId=placed')
  expect(mocks.checkout).not.toHaveBeenCalled();expect(mocks.fetch).not.toHaveBeenCalled()
})
it('rejects an older successful preflight if newer background stock reports an unavailable item',async()=>{
  let resolve!:(value:unknown)=>void
  await render();const old=result()
  mocks.checkout.mockImplementation(()=>new Promise(r=>{resolve=r}))
  await act(async()=>button('Pay ₹').click())
  await soldOut()
  await act(async()=>resolve(old))
  expect(useCart.getState().items[0].stock).toBe(0)
  expect(button('Update items to continue')).toBeDisabled()
  expect(mocks.place).not.toHaveBeenCalled();expect(mocks.fetch).not.toHaveBeenCalled()
})
it('requires review again if the authoritative total changes while acknowledging it',async()=>{
  await render();await soldOut()
  await act(async()=>button('Remove item: Dior Rouge Blush').click());await settle(120)
  mocks.checkout.mockImplementationOnce(async()=>{const changed=quote([{...item('milani',1500)}]);return {success:true,quote:changed,fingerprint:'new'}})
  await act(async()=>button('Confirm updated total').click())
  expect(button('Review updated total')).toBeDisabled()
  expect(button('Confirm updated total')).toHaveTextContent('1,550')
  expect(mocks.place).not.toHaveBeenCalled()
  await act(async()=>button('Confirm updated total').click())
  expect(button('Pay ₹')).toBeEnabled()
})
it('refreshes stock and stays in checkout when COD placement encounters a last-unit race',async()=>{
  await render()
  await act(async()=>button('Cash on Delivery').click())
  mocks.place.mockResolvedValue({success:false,message:'Out of stock'})
  mocks.fetch.mockResolvedValue({json:async()=>({success:false,message:'Out of stock',stock:[{variantId:'dior',stock:0}]})})
  await act(async()=>button('Place Order • COD').click());await settle()
  expect(container.querySelector('[data-checkout-variant="dior"]')).toHaveTextContent('Just sold out')
  expect(button('Update items to continue')).toBeDisabled()
  expect(mocks.push).not.toHaveBeenCalled()
})
it('preserves an applied gift card and uses it when confirming the revised total',async()=>{
  await render()
  mocks.gift.mockResolvedValue({success:true,giftCard:{code:'GIFT100',remaining_balance:100}})
  const input=container.querySelector('input[placeholder="Enter gift card code"]') as HTMLInputElement
  await act(async()=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'GIFT100')
    input.dispatchEvent(new Event('input',{bubbles:true}))
  })
  const apply=[...container.querySelectorAll('button')].find(b=>b.textContent==='Apply')!
  await act(async()=>apply.click())
  expect(container.textContent).toContain('GIFT100')
  await soldOut()
  await act(async()=>button('Remove item: Dior Rouge Blush').click());await settle(120)
  expect(container.textContent).toContain('GIFT100')
  expect(button('Confirm updated total')).toHaveTextContent('1,550')
  mocks.checkout.mockImplementation(async()=>{const checked=result();checked.quote.giftCardDiscount=100;checked.quote.total-=100;return checked})
  await act(async()=>button('Confirm updated total').click())
  expect(mocks.checkout.mock.calls[0][1].giftCardCode).toBe('GIFT100')
  expect(button('Pay ₹1,550')).toBeEnabled()
})
