// @vitest-environment node
import { beforeEach,expect,it,vi } from 'vitest'
import type {SupabaseClient} from '@supabase/supabase-js'
import {merchandiseQuote} from './cart-quote'
import {checkoutQuote} from './checkout-pricing'
import {quoteFingerprint} from './verified-payment'
import {checkoutOrderItems} from './checkout-order-items'
import {lineSubtotal} from './line-pricing'
import {evaluatePromotionSnapshot} from './promotion-preview'
import {emptyFlashTargets} from './flash-sale-helper'
type Row=Record<string,unknown>
const ids=Array.from({length:10},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
let tables:Record<string,Row[]>
function db():SupabaseClient{
 return {from(table:string){let rows=tables[table]||[];const q={select:()=>q,eq:(k:string,v:unknown)=>{rows=rows.filter(r=>r[k]===v);return q},in:(k:string,v:unknown[])=>{rows=rows.filter(r=>v.includes(r[k]));return q},lte:()=>q,gte:()=>q,
 order:()=>q,range:(from:number,to:number)=>{rows=rows.slice(from,to+1);return q},single:()=>Promise.resolve({data:rows[0]||null,error:rows[0]?null:{message:'not found'}}),maybeSingle:()=>Promise.resolve({data:rows[0]||null,error:null}),then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:rows,error:null}).then(resolve)};return q}} as unknown as SupabaseClient
}
beforeEach(()=>{
 vi.useRealTimers()
 tables={product_variants:[{id:ids[0],product_id:ids[1],title:'Default',price:1000,stock:100,is_default:true,discount_type:'percentage',discount_value:20,
 products:{name:'Lipstick',brand:'B',category_id:null,discount_type:'none',discount_value:0,thumbnail_url:'image'}}],product_categories:[{product_id:ids[1],category_id:ids[5]}],
 buy_x_get_y:[{id:ids[2],name:'Buy 2 Get 1',buy_type:'specific_products',buy_quantity:2,get_type:'cheapest_free',get_discount_type:'free',get_discount_value:100,max_per_order:null,is_active:true}],
 bxgy_buy_products:[{bxgy_id:ids[2],product_id:ids[1]}],
 free_gifts:[{id:ids[3],name:'Spend gift',gift_product_id:null,gift_product_ref_id:ids[4],gift_variant_id:null,gift_quantity:1,trigger_type:'cart_total',trigger_threshold:2000,is_active:true}],
 gift_products:[{id:ids[4],name:'Gift pouch',stock:10,price:500,is_active:true,images:['gift-image']}],
 shipping_methods:[{id:ids[6],zone_id:ids[7],price:50,name:'Delivery',is_active:true}],shipping_zones:[{id:ids[7],pincode:'795001'}]}
})
const cart=(qty:number)=>[{variantId:ids[0],quantity:qty,price:1,productId:'forged'}]
const input=()=>({shippingMethodId:ids[6],pincode:'795001'})
it('quotes the agreed 3-item example using selling prices and one fixed gift',async()=>{
 const q=await checkoutQuote(db(),ids[8],cart(3),input())
 expect(q).toMatchObject({subtotal:2400,bxgyDiscount:800,total:1650,hasAutomaticOffer:true})
 expect(q.freeItems).toMatchObject([{giftProductId:ids[4],productId:null,variantId:null,quantity:1,name:'Gift pouch'}])
 expect(q.promotions).toHaveLength(2)
})
it('six items earn two BXGY free units and still just one fixed gift',async()=>{
 const q=await checkoutQuote(db(),ids[8],cart(6),input())
 expect(q.bxgyDiscount).toBe(1600);expect(q.discounts[0].free_quantity).toBe(2);expect(q.freeItems).toHaveLength(1)
})
it('two marked-1000 products selling at 800 count as 1600 and earn no 2000-threshold gift',async()=>{
 const q=await merchandiseQuote(db(),null,cart(2))
 expect(q.subtotal).toBe(1600);expect(q.freeItems).toHaveLength(0)
})
it('uses the lowest applicable flash/regular selling price in both preview and checkout',async()=>{
 tables.flash_sales=[{is_active:true,scope:'all',discount_type:'percentage',discount_value:30,starts_at:'2020-01-01',ends_at:'2099-01-01'}]
 const preview=await merchandiseQuote(db(),ids[8],cart(3)),q=await checkoutQuote(db(),ids[8],cart(3),input())
 expect(preview.items[0].price).toBe(700);expect(q.subtotal).toBe(2100);expect(q.bxgyDiscount).toBe(700);expect(q.total).toBe(1450)
 expect(q.freeItems).toEqual(preview.freeItems)
})
it('rejects a coupon independently of client claims whenever an automatic reward is awarded',async()=>{
 await expect(checkoutQuote(db(),ids[8],cart(3),{...input(),promoCode:'TRY'})).rejects.toThrow('Coupons cannot be combined')
 tables.buy_x_get_y=[];tables.free_gifts[0].trigger_threshold=100
 await expect(checkoutQuote(db(),ids[8],cart(1),{...input(),promoCode:'TRY'})).rejects.toThrow('Coupons cannot be combined')
})
it('selects one available fixed gift deterministically across multiple eligible rules',async()=>{
 tables.free_gifts.push({...tables.free_gifts[0],id:ids[9],gift_product_ref_id:ids[8]})
 tables.gift_products.push({id:ids[8],name:'Bigger gift',stock:5,price:800,is_active:true})
 let q=await merchandiseQuote(db(),null,cart(6));expect(q.freeItems.map(g=>g.name)).toEqual(['Bigger gift'])
 tables.gift_products[1].stock=0;q=await merchandiseQuote(db(),null,cart(6));expect(q.freeItems.map(g=>g.name)).toEqual(['Gift pouch'])
})
it('resolves a store gift default variant and shares its stock with paid units',async()=>{
 tables.free_gifts[0]={...tables.free_gifts[0],gift_product_ref_id:null,gift_product_id:ids[1]};tables.products=[{id:ids[1],name:'Lipstick',thumbnail_url:'i'}]
 tables.product_variants[0].stock=3
 expect((await merchandiseQuote(db(),null,cart(3))).freeItems).toHaveLength(0)
 tables.product_variants[0].stock=4
 expect((await merchandiseQuote(db(),null,cart(3))).freeItems).toMatchObject([{variantId:ids[0],productId:ids[1],giftProductId:null}])
})
it('uses rule-specific customer usage and never trusts gift or rule IDs supplied by the client',async()=>{
 tables.buy_x_get_y[0].once_per_user=true;tables.free_gifts[0].once_per_user=true
 tables.checkout_promotion_uses=[{user_id:ids[8],kind:'bxgy',promotion_id:ids[2]},{user_id:ids[8],kind:'gift',promotion_id:ids[3]}]
 const q=await merchandiseQuote(db(),ids[8],[...cart(3),{variantId:'invented',quantity:999,is_gift:true}])
 expect(q.bxgyDiscount).toBe(0);expect(q.freeItems).toHaveLength(0)
 expect((await merchandiseQuote(db(),ids[9],cart(3))).bxgyDiscount).toBe(800)
})
it('binds gift identity to the payment fingerprint even when payment amount is unchanged',async()=>{
 const first=await checkoutQuote(db(),ids[8],cart(3),input())
 tables.free_gifts[0].id=ids[9]
 const second=await checkoutQuote(db(),ids[8],cart(3),input())
 expect(first.total).toBe(second.total);expect(quoteFingerprint(first,input())).not.toBe(quoteFingerprint(second,input()))
})
it('does not discard coin or gift-credit paise when calculating the amount payable',async()=>{
 tables.buy_x_get_y=[];tables.free_gifts=[];tables.gift_cards=[{code:'CREDIT',status:'active',remaining_balance:100.25}]
 const q=await checkoutQuote(db(),ids[8],cart(1),{...input(),giftCardCode:'CREDIT'})
 expect(q.total).toBe(749.75)
})
it('keeps fractional coupon amounts and target-line allocations consistent',async()=>{
 tables.buy_x_get_y=[];tables.free_gifts=[]
 tables.promo_codes=[{id:ids[9],code:'TARGET',apply_to:'specific_products',is_active:true,discount_type:'percentage',discount_value:2.5,promo_code_products:[{product_id:ids[1]}],promo_code_categories:[]}]
 tables.product_variants[0].price=100;tables.product_variants[0].discount_type='none';tables.product_variants[0].products={name:'P',brand:'B',category_id:null,discount_type:'none',discount_value:0}
 const q=await checkoutQuote(db(),ids[8],cart(1),{...input(),promoCode:'TARGET'})
 expect(q.promoDiscount).toBe(2.5);expect(q.total).toBe(147.5);expect(q.promoEligibleVariantIds).toEqual([ids[0]])
})
it.each([[3,3000,1000,2000],[4,3800,1000,2800],[5,4600,1000,3600],[6,6000,2000,4000]])('quotes and stores original-price offer groups with %i units and discounted extras',async(quantity,subtotal,discount,total)=>{
 tables.buy_x_get_y[0].pricing_mode='replace_discounts'
 const preview=await merchandiseQuote(db(),ids[8],cart(quantity))
 const q=await checkoutQuote(db(),ids[8],cart(quantity),input())
 expect(q).toMatchObject({subtotal,bxgyDiscount:discount,total})
 expect(preview.items).toEqual(q.items)
 const stored=checkoutOrderItems(q)
 expect(stored.reduce((n,i)=>n+i.quantity,0)).toBe(quantity)
 expect(stored.reduce((n,i)=>n+i.unit_price*i.quantity-i.line_discount_amount,0)).toBe(subtotal-discount)
 expect(stored.every(i=>i.unit_price===800||i.unit_price===1000)).toBe(true)
 expect(lineSubtotal(q.items[0])).toBe(subtotal)
 expect(stored.reduce((n,i)=>n+i.line_discount_amount,0)).toBe(discount)
 if(quantity%3)expect(stored.find(i=>i.unit_price===800)).toMatchObject({quantity:quantity%3,line_discount_amount:0})
})
it('does not inflate a fixed-gift threshold with replacement prices',async()=>{
 tables.buy_x_get_y[0].pricing_mode='replace_discounts';tables.free_gifts[0].trigger_threshold=2800
 const q=await merchandiseQuote(db(),null,cart(3))
 expect(q.subtotal).toBe(3000);expect(q.qualifyingSubtotal).toBe(2400);expect(q.freeItems).toHaveLength(0)
})
it('replaces flash prices on offer units and keeps the sale price on extra units',async()=>{
 tables.buy_x_get_y[0].pricing_mode='replace_discounts'
 tables.flash_sales=[{is_active:true,scope:'all',discount_type:'percentage',discount_value:40,starts_at:'2020-01-01',ends_at:'2099-01-01'}]
 const q=await checkoutQuote(db(),ids[8],cart(4),input())
 expect(q).toMatchObject({subtotal:3600,bxgyDiscount:1000,total:2600})
 expect(checkoutOrderItems(q)).toMatchObject([{quantity:3,unit_price:1000,line_discount_amount:1000},{quantity:1,unit_price:600,line_discount_amount:0}])
})
it('binds rule pricing mode and paid allocations to the payment fingerprint',async()=>{
 tables.product_variants[0].discount_type='none'
 const first=await checkoutQuote(db(),ids[8],cart(3),input())
 tables.buy_x_get_y[0].pricing_mode='replace_discounts'
 const second=await checkoutQuote(db(),ids[8],cart(3),input())
 expect(first.total).toBe(second.total);expect(quoteFingerprint(first,input())).not.toBe(quoteFingerprint(second,input()))
})
it('preserves paise in original-price units and exact stored price groups',async()=>{
 tables.buy_x_get_y[0].pricing_mode='replace_discounts';tables.product_variants[0].price=99.99
 const q=await checkoutQuote(db(),ids[8],cart(4),input())
 expect(q).toMatchObject({subtotal:379.97,bxgyDiscount:99.99,total:329.98})
 expect(checkoutOrderItems(q)).toMatchObject([{unit_price:99.99,quantity:3,line_discount_amount:99.99},{unit_price:80,quantity:1,line_discount_amount:0}])
})
it('combines different selected brands in the canonical server quote',async()=>{
 tables.free_gifts=[]
 tables.buy_x_get_y[0]={...tables.buy_x_get_y[0],buy_type:'specific_brands',pricing_mode:'replace_discounts'}
 tables.product_variants[0].products={name:'Milani',brand:'Milani',discount_type:'percentage',discount_value:20}
 tables.bxgy_buy_brands=[{bxgy_id:ids[2],brand:'Milani'},{bxgy_id:ids[2],brand:'RELOVE'}]
 tables.product_variants.push({...tables.product_variants[0],id:ids[8],product_id:ids[9],price:500,products:{name:'RELOVE',brand:'RELOVE',discount_type:'none',discount_value:0}})
 const q=await checkoutQuote(db(),ids[3],[...cart(2),{variantId:ids[8],quantity:1}],input())
 expect(q).toMatchObject({subtotal:2500,bxgyDiscount:500,total:2050})
 expect(q.discounts[0].variant_id).toBe(ids[8])
})
it.each(['replace_discounts','combine_discounts'])('matches instantaneous previews to fresh server quotes in %s mode',async pricing_mode=>{
 tables.buy_x_get_y[0].pricing_mode=pricing_mode
 const first=await merchandiseQuote(db(),ids[8],cart(3))
 for(const quantity of [2,3,4,5,6,9]){
   const preview=evaluatePromotionSnapshot(first.items.map(i=>({...i,quantity})),first.previewCatalog!)
   const fresh=await merchandiseQuote(db(),ids[8],cart(quantity))
   expect(preview.items).toEqual(fresh.items)
   expect(preview.bxgyDiscount).toBe(fresh.bxgyDiscount)
   expect(preview.subtotal).toBe(fresh.subtotal)
   expect(preview.freeItems).toEqual(fresh.freeItems)
 }
})
it('charges variant-specific flash prices consistently with the storefront and leaves other variants at normal prices',async()=>{
 tables.buy_x_get_y=[];tables.free_gifts=[]
 tables.product_variants.push({...tables.product_variants[0],id:ids[9]})
 tables.flash_sales=[{is_active:true,lifecycle:'published',scope:'product',target_config:{...emptyFlashTargets(),variant_ids:[{product_id:ids[1],variant_id:ids[0]}]},discount_type:'percentage',discount_value:40,starts_at:'2020-01-01',ends_at:'2099-01-01'}]
 const q=await merchandiseQuote(db(),null,[...cart(1),{variantId:ids[9],quantity:1}])
 expect(q.items.map(i=>i.price)).toEqual([600,800])
 expect(q.items.map(i=>i.regularPrice)).toEqual([800,800])
})
it('selects the lowest real price across overlapping percentage and fixed flash campaigns',async()=>{
 tables.buy_x_get_y=[];tables.free_gifts=[]
 tables.flash_sales=[{is_active:true,scope:'all',discount_type:'percentage',discount_value:40,starts_at:'2020-01-01',ends_at:'2099-01-01'},
 {is_active:true,scope:'all',discount_type:'fixed',discount_value:100,starts_at:'2020-01-01',ends_at:'2099-01-01'}]
 expect((await merchandiseQuote(db(),null,cart(1))).items[0].price).toBe(600)
})
it('reprices instantly at sale expiry, including BXGY units, fixed-gift eligibility and discounted extras',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-02T12:00:00Z'))
 tables.buy_x_get_y[0].pricing_mode='replace_discounts'
 tables.flash_sales=[{is_active:true,scope:'all',discount_type:'percentage',discount_value:40,starts_at:'2020-01-01',ends_at:'2026-11-02T12:00:01Z'}]
 const first=await merchandiseQuote(db(),null,cart(4))
 expect(first.subtotal-first.bxgyDiscount).toBe(2600)
 vi.setSystemTime(new Date('2026-11-02T12:00:01Z'))
 const preview=evaluatePromotionSnapshot(first.items,first.previewCatalog!)
 const fresh=await merchandiseQuote(db(),null,cart(4))
 expect(preview.subtotal-preview.bxgyDiscount).toBe(2800)
 expect(preview.items).toEqual(fresh.items)
 expect(preview.freeItems).toEqual(fresh.freeItems)
})
