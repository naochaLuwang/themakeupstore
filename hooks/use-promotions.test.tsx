import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,createElement,useEffect} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {usePromotions} from './use-promotions'
import {useCart,type CartItem} from '@/components/store/use-cart'
import {evaluatePromotionSnapshot,type PromotionSnapshot} from '@/lib/promotion-preview'

const mocks=vi.hoisted(()=>({fetch:vi.fn(),getUser:vi.fn(),authListener:null as null|((event:string,session:{user:{id:string}}|null)=>void)}))
vi.mock('@/utils/supabase/client',()=>({createClient:()=>({auth:{getUser:mocks.getUser,onAuthStateChange:(fn:typeof mocks.authListener)=>{mocks.authListener=fn;return {data:{subscription:{unsubscribe:vi.fn()}}}}}})}))
const roots:{root:Root;container:HTMLElement}[]=[]
;(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true
async function renderHook(){
 const container=document.createElement('div');document.body.append(container)
 const root=createRoot(container);roots.push({root,container})
 const resultRef={current:undefined as unknown as ReturnType<typeof usePromotions>}
 function Probe(){const value=usePromotions();useEffect(()=>{resultRef.current=value},[value]);return null}
 await act(async()=>root.render(createElement(Probe)))
 return resultRef
}
function cleanup(){for(const {root,container} of roots.splice(0)){act(()=>root.unmount());container.remove()}}
const item:CartItem={id:'v',variantId:'v',productId:'p',categoryId:'c',categoryIds:['c'],brand:'Milani',name:'P',variantTitle:'',price:80,mrp:100,originalPrice:100,image:'',quantity:3,stock:20}
function catalog(ownerId='customer'):PromotionSnapshot{return {ownerId,bxgyRules:[{id:'r',name:'Buy 2 Get 1',is_active:true,buy_type:'specific_brands',brands:['Milani'],categories:[],products:[],buy_quantity:2,get_type:'cheapest_free',get_discount_type:'free',get_discount_value:100,pricing_mode:'replace_discounts'}],giftRules:[],giftOptions:[],usedBXGY:[],usedGifts:[],expiresAt:Date.now()+30000}}
function result(qty=3,snapshot=catalog()) {return {success:true,quote:{...evaluatePromotionSnapshot([{...item,quantity:qty,brand:'Milani',categoryIds:['c']}],snapshot),previewCatalog:snapshot}}}
const response=(body:unknown)=>({json:async()=>body})
beforeEach(()=>{
 vi.useFakeTimers();vi.clearAllMocks();vi.stubGlobal('fetch',mocks.fetch)
 useCart.setState({offerCatalog:null,offerVerifiedUntil:0});useCart.getState().clearCart();useCart.getState().addItem(item)
 mocks.fetch.mockImplementation(async()=>response(result()))
})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers()})
async function settle(ms=0){await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}

it('starts the first verification immediately without a client auth request or debounce',async()=>{
 const state=await renderHook()
 expect(mocks.fetch).toHaveBeenCalledTimes(1);expect(mocks.getUser).not.toHaveBeenCalled()
 expect(state.current.checking).toBe(false);expect(useCart.getState().getFinalTotal()).toBe(200)
})
it('changes offer totals synchronously while the background verification remains unresolved',async()=>{
 await renderHook()
 mocks.fetch.mockImplementation(()=>new Promise(()=>{}))
 act(()=>useCart.getState().updateQuantity('v',4))
 expect(useCart.getState().getFinalTotal()).toBe(280)
 expect(useCart.getState().getBXGYTotalDiscount()).toBe(100)
 expect(mocks.fetch).toHaveBeenCalledTimes(1)
 await settle(120);expect(mocks.fetch).toHaveBeenCalledTimes(2)
 expect(useCart.getState().getFinalTotal()).toBe(280)
})
it('preloads rules on an empty browsing cart and applies them in the first add-item render',async()=>{
 useCart.getState().clearCart()
 mocks.fetch.mockResolvedValue(response({success:true,previewCatalog:catalog()}))
 await renderHook()
 expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual([])
 act(()=>useCart.getState().addItem(item))
 expect(useCart.getState().getFinalTotal()).toBe(200)
})
it('shares one verifier across badges, cart and checkout consumers',async()=>{
 await renderHook();await renderHook();await renderHook()
 expect(mocks.fetch).toHaveBeenCalledTimes(1)
})
it('retains a fresh quote when navigating between pages and does not refresh on focus unnecessarily',async()=>{
 await renderHook();cleanup();await renderHook()
 act(()=>window.dispatchEvent(new Event('focus')));await settle()
 expect(mocks.fetch).toHaveBeenCalledTimes(1)
})
it('coalesces rapid quantity clicks but calculates every intermediate total immediately',async()=>{
 await renderHook()
 act(()=>useCart.getState().updateQuantity('v',4));expect(useCart.getState().getFinalTotal()).toBe(280)
 act(()=>useCart.getState().updateQuantity('v',5));expect(useCart.getState().getFinalTotal()).toBe(360)
 act(()=>useCart.getState().updateQuantity('v',6));expect(useCart.getState().getFinalTotal()).toBe(400)
 mocks.fetch.mockResolvedValue(response(result(6)))
 await settle(120)
 expect(mocks.fetch).toHaveBeenCalledTimes(2)
 expect(JSON.parse(mocks.fetch.mock.calls[1][1].body)).toEqual([{variantId:'v',quantity:6}])
})
it('ignores an old response even when its transport does not honor cancellation',async()=>{
 let resolve!:(value:unknown)=>void
 mocks.fetch.mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
 await renderHook()
 mocks.fetch.mockResolvedValue(response(result(2)))
 act(()=>useCart.getState().updateQuantity('v',2));await settle(120)
 await act(async()=>resolve(response(result(3))))
 expect(useCart.getState().items[0].quantity).toBe(2)
 expect(useCart.getState().getFinalTotal()).toBe(160)
})
it('invalidates private eligibility on account switch and ignores a previous-account response',async()=>{
 await renderHook()
 let resolve!:(value:unknown)=>void
 mocks.fetch.mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
 act(()=>useCart.getState().updateQuantity('v',4));await settle(120)
 const next=catalog('other');next.usedBXGY=['r'];next.bxgyRules[0].once_per_user=true
 mocks.fetch.mockResolvedValue(response(result(4,next)))
 act(()=>mocks.authListener?.('SIGNED_IN',{user:{id:'other'}}))
 expect(useCart.getState().offerCatalog).toBeNull()
 await settle()
 await act(async()=>resolve(response(result(4))))
 expect(useCart.getState().offerCatalog?.ownerId).toBe('other')
 expect(useCart.getState().getBXGYTotalDiscount()).toBe(0)
})
it('uses one expiry refresh and removes expired campaigns locally before the new request completes',async()=>{
 const snapshot=catalog();snapshot.bxgyRules[0].expires_at=new Date(Date.now()+1000).toISOString();snapshot.expiresAt=Date.now()+1000
 mocks.fetch.mockResolvedValueOnce(response(result(3,snapshot))).mockImplementation(()=>new Promise(()=>{}))
 await renderHook();await settle(1000)
 expect(mocks.fetch).toHaveBeenCalledTimes(2)
 expect(useCart.getState().getBXGYTotalDiscount()).toBe(0)
 expect(useCart.getState().getFinalTotal()).toBe(240)
})
it('keeps the preview visible and exposes retry guidance after a verification failure',async()=>{
 await renderHook();mocks.fetch.mockRejectedValue(new Error('Network unavailable'))
 act(()=>useCart.getState().updateQuantity('v',4));await settle(120)
 expect(useCart.getState().getFinalTotal()).toBe(280)
 expect(useCart.getState().offerError).toBe('Network unavailable')
})
it('reports a cold-load error without hanging or inventing an offer',async()=>{
 mocks.fetch.mockRejectedValue(new Error('Network unavailable'))
 const state=await renderHook()
 expect(state.current.error).toBe('Network unavailable');expect(useCart.getState().getBXGYTotalDiscount()).toBe(0)
})
it('cleans up requests and scheduled work when the last consumer leaves',async()=>{
 await renderHook();cleanup();await settle(60000)
 expect(mocks.fetch).toHaveBeenCalledTimes(1)
})
it('does not apply another account snapshot or repeatedly request it in a loop',async()=>{
 await renderHook()
 mocks.fetch.mockResolvedValue(response(result(3,catalog('previous'))))
 act(()=>mocks.authListener?.('SIGNED_IN',{user:{id:'next'}}));await settle()
 expect(useCart.getState().offerCatalog).toBeNull()
 expect(useCart.getState().offerError).toContain('account changed')
 const calls=mocks.fetch.mock.calls.length
 await settle(500)
 expect(mocks.fetch).toHaveBeenCalledTimes(calls)
})
it('does not overwrite a newer checkout quote with an older background quote for the same basket',async()=>{
 await renderHook()
 let resolve!:(value:unknown)=>void
 mocks.fetch.mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
 act(()=>useCart.getState().updateQuantity('v',4));await settle(120)
 const newer=catalog();newer.bxgyRules=[]
 act(()=>useCart.getState().applyOfferQuote(result(4,newer).quote))
 await act(async()=>resolve(response(result(4))))
 expect(useCart.getState().getFinalTotal()).toBe(320)
 expect(useCart.getState().getBXGYTotalDiscount()).toBe(0)
})
