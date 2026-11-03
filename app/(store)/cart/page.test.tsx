import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import CartPage from './page'
import { useCart, type CartItem } from '@/components/store/use-cart'
import { evaluatePromotionSnapshot, type PromotionSnapshot } from '@/lib/promotion-preview'

const mocks=vi.hoisted(()=>({fetch:vi.fn()}))
vi.mock('next/link',()=>({default:({href,children,...props}:{href:string;children:ReactNode})=><a href={href} {...props}>{children}</a>}))
// The test verifies cart state and controls, not Next.js image optimization.
// eslint-disable-next-line @next/next/no-img-element
vi.mock('next/image',()=>({default:({src,alt}:{src:string;alt:string})=><img src={src} alt={alt}/>}))
vi.mock('next/dynamic',()=>({default:()=>()=>null}))
vi.mock('@/components/store/product-card',()=>({ProductCard:()=>null}))
vi.mock('@/components/store/cart-offer-cards',()=>({CartOfferCards:()=>null}))
vi.mock('@/hooks/use-recently-viewed',()=>{
  const state={items:[],clear:()=>{}}
  return {useRecentlyViewed:(selector:(value:typeof state)=>unknown)=>selector(state)}
})
vi.mock('@/app/actions/promo',()=>({validatePromoCode:vi.fn()}))
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}))
vi.mock('@/utils/supabase/client',()=>({createClient:()=>({
  auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})},
  from:()=>({select:()=>({in:()=>({limit:async()=>({data:[]})})})}),
})}))

const item:CartItem={id:'p',productId:'p',variantId:'v',categoryId:'c',categoryIds:['c'],brand:'Milani',name:'Lipstick',variantTitle:'Rose',
  price:800,mrp:1000,originalPrice:1000,image:'/p.jpg',quantity:3,stock:20}
const catalog=():PromotionSnapshot=>({ownerId:null,bxgyRules:[],giftRules:[],giftOptions:[],usedBXGY:[],usedGifts:[],expiresAt:Date.now()+30000})
function validQuote(stock=20,quantity=3){const snapshot=catalog();return {...evaluatePromotionSnapshot([{...item,stock,quantity,brand:'Milani',categoryIds:['c']}],snapshot),previewCatalog:snapshot}}
const response=(data:unknown)=>({json:async()=>data})
let root:Root,container:HTMLDivElement
beforeEach(()=>{
  vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('fetch',mocks.fetch);mocks.fetch.mockReset()
  useCart.getState().clearCart();useCart.setState({offerCatalog:null,items:[{...item}],offerStatus:'idle',offerError:'',offerVerifiedUntil:0})
  container=document.createElement('div');document.body.append(container);root=createRoot(container)
})
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();vi.useRealTimers()})
async function render(){await act(async()=>root.render(<CartPage/>))}
async function settle(ms=0){await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
const links=()=>container.querySelectorAll('a[href="/checkout"]')
const disabled=()=>[...container.querySelectorAll('button:disabled')].filter(b=>/out of stock|quantities|availability/i.test(b.textContent||''))

it('replaces saved positive stock with zero and disables both checkout controls when verification rejects the cart',async()=>{
  let resolve!:(value:unknown)=>void
  mocks.fetch.mockImplementation(()=>new Promise(r=>{resolve=r}))
  await render()
  expect(links()).toHaveLength(0);expect(disabled()).toHaveLength(2)
  await act(async()=>resolve(response({success:false,message:'Lipstick is out of stock.',stock:[{variantId:'v',stock:0}]})))
  expect(useCart.getState().items[0]).toMatchObject({stock:0,quantity:3})
  expect([...container.querySelectorAll('span')].filter(s=>s.textContent==='Out of Stock')).toHaveLength(2)
  expect(container.textContent).not.toContain('Lipstick is out of stock.')
  expect([...container.querySelectorAll('button')].some(b=>b.textContent?.includes('Try again'))).toBe(false)
  expect(links()).toHaveLength(0);expect(disabled()).toHaveLength(2)
})
it('blocks quantities above available stock, then enables checkout after the customer reduces quantity and a quote succeeds',async()=>{
  mocks.fetch.mockResolvedValueOnce(response({success:false,message:'Only 2 available.',stock:[{variantId:'v',stock:2}]}))
  await render()
  expect(container.textContent).toContain('Only 2 available')
  expect(links()).toHaveLength(0);expect(disabled()).toHaveLength(2)
  mocks.fetch.mockResolvedValue(response({success:true,quote:validQuote(2,2)}))
  const minus=[...container.querySelectorAll('button')].find(b=>b.querySelector('svg.lucide-minus'))!
  await act(async()=>minus.click());await settle(120)
  expect(useCart.getState().items[0].quantity).toBe(2)
  expect(container.textContent).not.toContain('Only 2 available')
  expect(links()).toHaveLength(2)
})
it('keeps checkout blocked when availability cannot be verified and allows a successful retry',async()=>{
  mocks.fetch.mockRejectedValueOnce(new Error('Network unavailable'))
  await render()
  expect(links()).toHaveLength(0)
  expect(disabled().every(b=>b.textContent?.includes('Unable to verify availability'))).toBe(true)
  mocks.fetch.mockResolvedValue(response({success:true,quote:validQuote()}))
  const retry=[...container.querySelectorAll('button')].find(b=>b.textContent?.includes('Try again'))!
  await act(async()=>retry.click());await settle()
  expect(links()).toHaveLength(2)
})
it('keeps checkout instant for a warm cart with a valid current quote',async()=>{
  useCart.getState().applyOfferQuote(validQuote())
  await render()
  expect(links()).toHaveLength(2);expect(mocks.fetch).not.toHaveBeenCalled()
})
