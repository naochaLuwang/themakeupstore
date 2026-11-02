import {beforeEach,expect,it} from 'vitest'
import {useCart,type CartItem} from './use-cart'
import type {merchandiseQuote} from '@/lib/cart-quote'
import type {PromotionSnapshot} from '@/lib/promotion-preview'
const item:CartItem={id:'v',variantId:'v',productId:'p',categoryId:'c',name:'P',variantTitle:'',price:100,mrp:100,originalPrice:100,image:'',quantity:3,stock:20}
beforeEach(()=>{localStorage.clear();useCart.setState({offerCatalog:null});useCart.getState().clearCart()})
it('clears discounts, gifts and progress as soon as the cart is cleared',()=>{
 useCart.setState({items:[item],bxgyDiscounts:[{discount_amount:100} as never],hasAutomaticOffer:true,giftProgress:[{} as never],bxgyProgress:[{} as never]})
 useCart.getState().clearCart();useCart.getState().addItem({...item,quantity:1,price:50})
 expect(useCart.getState().getBXGYTotalDiscount()).toBe(0);expect(useCart.getState().getFinalTotal()).toBe(50)
 expect(useCart.getState().giftProgress).toEqual([]);expect(useCart.getState().bxgyProgress).toEqual([])
})
it('replaces the complete reward set and keeps a paid and gifted variant distinct',()=>{
 const q={items:[{...item,categoryIds:['c'],brand:'B'}],freeItems:[{productId:'p',variantId:'v',giftProductId:null,ruleId:'r',ruleName:'Gift',quantity:1,name:'Gift',mrp:100,image:''}],
 discounts:[],giftProgress:[],bxgyProgress:[],hasAutomaticOffer:true} as unknown as Awaited<ReturnType<typeof merchandiseQuote>>
 useCart.getState().applyOfferQuote(q)
 expect(useCart.getState().items.map(i=>i.variantId)).toEqual(['v','gift:r'])
 expect(useCart.getState().getSubtotal()).toBe(300)
 useCart.getState().applyOfferQuote({...q,freeItems:[],hasAutomaticOffer:false})
 expect(useCart.getState().items).toHaveLength(1)
})
it('invalidates all derived offer state immediately when paid quantity changes',()=>{
 useCart.setState({items:[item,{...item,id:'gift:r',variantId:'gift:r',is_gift:true,price:0,quantity:1}],hasAutomaticOffer:true,bxgyDiscounts:[{discount_amount:100} as never]})
 useCart.getState().updateQuantity('v',2)
 expect(useCart.getState().items).toHaveLength(1);expect(useCart.getState().offerStatus).toBe('idle');expect(useCart.getState().getBXGYTotalDiscount()).toBe(0)
})
it('blocks coupon savings with either kind of automatic offer',()=>{
 useCart.setState({items:[item],appliedPromo:{apply_to:'all',discount_type:'percentage',discount_value:10},hasAutomaticOffer:true})
 expect(useCart.getState().getDiscountAmount()).toBe(0)
})
it('does not round away valid paise in a non-offer coupon total',()=>{
 useCart.setState({items:[{...item,quantity:1}],appliedPromo:{apply_to:'all',discount_type:'fixed',discount_value:2.5},hasAutomaticOffer:false})
 expect(useCart.getState().getDiscountAmount()).toBe(2.5);expect(useCart.getState().getFinalTotal()).toBe(97.5)
})
it('uses original prices for offer units and normal selling prices for extras, then clears pricing when quantity changes',()=>{
 const repriced={...item,price:800,mrp:1000,originalPrice:1000,quantity:4,priceBreakdown:[{price:1000,quantity:3,discounts:[]},{price:800,quantity:1,discounts:[]}]}
 useCart.setState({items:[repriced],bxgyDiscounts:[{discount_amount:1000} as never],hasAutomaticOffer:true})
 expect(useCart.getState().getSubtotal()).toBe(3800);expect(useCart.getState().getFinalTotal()).toBe(2800)
 useCart.getState().updateQuantity('v',2)
 expect(useCart.getState().getSubtotal()).toBe(1600);expect(useCart.getState().items[0].priceBreakdown).toBeUndefined()
})
const catalog=():PromotionSnapshot=>({ownerId:null,bxgyRules:[{id:'r',name:'B2G1',is_active:true,buy_type:'specific_products',products:['p'],categories:[],brands:[],buy_quantity:2,get_type:'cheapest_free',get_discount_type:'free',get_discount_value:100,pricing_mode:'replace_discounts'}],giftRules:[],giftOptions:[],usedBXGY:[],usedGifts:[],expiresAt:Date.now()+30000})
it('publishes the new quantity and recalculated offer together, without an undiscounted intermediate render',()=>{
 useCart.getState().setOfferCatalog(catalog())
 useCart.getState().addItem({...item,price:80,brand:'B',categoryIds:['c']})
 const observed:number[]=[]
 const unsubscribe=useCart.subscribe(state=>{if(state.items[0]?.quantity===6)observed.push(state.getFinalTotal())})
 useCart.getState().updateQuantity('v',6)
 unsubscribe()
 expect(observed.length).toBeGreaterThan(0);expect(observed.every(total=>total===400)).toBe(true)
})
it('removes an unearned fixed gift immediately and shares gift stock with paid units',()=>{
 const snapshot=catalog();snapshot.bxgyRules=[]
 snapshot.giftRules=[{id:'gift',name:'Gift',is_active:true,trigger_type:'specific_products',trigger_threshold:3,gift_product_id:'p',gift_product_ref_id:null,gift_variant_id:'v',gift_quantity:1,products:['p'],categories:[],brands:[]}]
 snapshot.giftOptions=[{ruleId:'gift',ruleName:'Gift',productId:'p',variantId:'v',giftProductId:null,quantity:1,name:'Gift',mrp:100,image:'',stock:4}]
 useCart.getState().setOfferCatalog(snapshot)
 useCart.getState().addItem({...item,brand:'B',categoryIds:['c']})
 expect(useCart.getState().getGiftItems()).toHaveLength(1)
 useCart.getState().updateQuantity('v',4)
 expect(useCart.getState().getGiftItems()).toHaveLength(0)
 useCart.getState().updateQuantity('v',2)
 expect(useCart.getState().getGiftItems()).toHaveLength(0)
})
it('never persists customer offer eligibility or derived price groups',()=>{
 useCart.getState().setOfferCatalog(catalog())
 useCart.getState().addItem({...item,price:80,brand:'B',categoryIds:['c']})
 const stored=JSON.parse(localStorage.getItem('shopping-cart')!).state
 expect(stored.offerCatalog).toBeUndefined();expect(stored.offerVerifiedUntil).toBeUndefined()
 expect(stored.items[0].priceBreakdown).toBeUndefined()
})
