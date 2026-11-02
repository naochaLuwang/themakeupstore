// @vitest-environment node
import {expect,it} from 'vitest'
import {emptyFlashTargets,flashSaleStatus,flashSaleMatchesProduct,variantFlashPricing,productFlashPricing,pricedFlashCatalog,type FlashSaleRow} from './flash-sale-helper'
import {flashSaleSchema} from './flash-sale-admin'
const now=Date.parse('2026-11-02T12:00:00Z')
const sale=(patch:Partial<FlashSaleRow>={}):FlashSaleRow=>({id:'a',scope:'all',product_id:null,category_id:null,brand:null,discount_type:'percentage',discount_value:40,label:'Sale',starts_at:'2026-11-01T00:00:00Z',ends_at:'2026-11-03T00:00:00Z',is_active:true,lifecycle:'published',...patch})
const product={id:'p',brand:'Milani',categoryIds:['cat'],discount_type:'percentage',discount_value:20}
const variant={id:'v',price:1000,discount_type:'none',discount_value:0}
it('compares percentage and fixed campaigns using actual variant prices in either order',()=>{
 for(const sales of [[sale(),sale({id:'b',discount_type:'fixed',discount_value:100})],[sale({id:'b',discount_type:'fixed',discount_value:100}),sale()]])expect(variantFlashPricing(variant,product,sales,now).salePrice).toBe(600)
 expect(variantFlashPricing({...variant,price:100},product,[sale(),sale({discount_type:'fixed',discount_value:50})],now).salePrice).toBe(50)
})
it('uses deterministic IDs when equal prices overlap',()=>{
 expect(variantFlashPricing(variant,product,[sale({id:'z'}),sale({id:'a'})],now).flashSale?.id).toBe('a')
})
it('keeps the lower normal price and does not label it a flash sale',()=>{
 expect(variantFlashPricing(variant,{...product,discount_value:60},[sale()],now)).toMatchObject({salePrice:400,isFlashSale:false,flashSale:null})
})
it('uses product discounts when a variant says none, but respects explicit zero variant discounts',()=>{
 expect(variantFlashPricing(variant,product,[],now).salePrice).toBe(800)
 expect(variantFlashPricing({...variant,discount_type:'percentage',discount_value:0},product,[],now).salePrice).toBe(1000)
})
it('only discounts a specifically selected variant',()=>{
 const config={...emptyFlashTargets(),variant_ids:[{product_id:'p',variant_id:'v'}]}
 expect(variantFlashPricing(variant,product,[sale({scope:'product',target_config:config})],now).salePrice).toBe(600)
 expect(variantFlashPricing({...variant,id:'other'},product,[sale({scope:'product',target_config:config})],now).salePrice).toBe(800)
})
it.each(['product','brand','category'] as const)('pools multiple %s targets',scope=>{
 const target_config={...emptyFlashTargets(),product_ids:['other','p'],brands:['RELOVE','Milani'],category_ids:['other','cat']}
 expect(flashSaleMatchesProduct(sale({scope,target_config}),'p',['cat'],'Milani','v',now)).toBe(true)
})
it.each(['exclude_product_ids','exclude_variant_ids','exclude_category_ids','exclude_brands'] as const)('%s overrides whole-store eligibility',key=>{
 const target_config={...emptyFlashTargets(),[key]:[key==='exclude_product_ids'?'p':key==='exclude_variant_ids'?'v':key==='exclude_category_ids'?'cat':'Milani']}
 expect(variantFlashPricing(variant,product,[sale({target_config})],now).salePrice).toBe(800)
})
it('uses category junctions even when the flat category is absent',()=>{
 expect(variantFlashPricing(variant,{...product,categoryIds:[],product_categories:[{category_id:'cat'}]},[sale({scope:'category',category_id:'cat'})],now).salePrice).toBe(600)
})
it('includes the start and excludes the exact end, retaining normal prices after expiry',()=>{
 const sales=[sale()]
 expect(variantFlashPricing(variant,product,sales,Date.parse(sales[0].starts_at)-1).salePrice).toBe(800)
 expect(variantFlashPricing(variant,product,sales,Date.parse(sales[0].starts_at)).salePrice).toBe(600)
 expect(variantFlashPricing(variant,product,sales,Date.parse(sales[0].ends_at)).salePrice).toBe(800)
})
it.each(['draft','paused','ended'] as const)('never charges an unpublished %s price',lifecycle=>{
 expect(variantFlashPricing(variant,product,[sale({lifecycle,is_active:false})],now).salePrice).toBe(800)
})
it('keeps zero prices valid and clamps fixed discounts at zero',()=>{
 expect(variantFlashPricing(variant,product,[sale({discount_value:100})],now).salePrice).toBe(0)
 expect(variantFlashPricing(variant,product,[sale({discount_type:'fixed',discount_value:2000})],now).salePrice).toBe(0)
})
it('rejects invalid date ranges in price matching',()=>{
 expect(flashSaleMatchesProduct(sale({starts_at:'invalid'}),'p',[],'Milani','v',now)).toBe(false)
})
it('distinguishes all campaign states without rewriting the schedule',()=>{
 expect(flashSaleStatus(sale(),now)).toBe('live')
 expect(flashSaleStatus(sale({starts_at:'2099-01-01'}),now)).toBe('scheduled')
 expect(flashSaleStatus(sale({ends_at:'2020-01-01'}),now)).toBe('ended')
 expect(flashSaleStatus(sale({lifecycle:'draft',ends_at:'2020-01-01'}),now)).toBe('draft')
})
const input={name:'Sale',scope:'all',target_config:emptyFlashTargets(),discount_type:'percentage',discount_value:20,starts_at:'2026-01-01T00:00:00Z',ends_at:'2099-01-01T00:00:00Z',lifecycle:'draft'}
it.each([{discount_value:Infinity},{discount_value:NaN},{discount_value:-1},{discount_value:101},{starts_at:'invalid'},{ends_at:'2020-01-01T00:00:00Z'},{scope:'unknown'},{name:''},{scope:'brand'},{scope:'product'}])('validates campaign input %j',patch=>{
 expect(flashSaleSchema.safeParse({...input,...patch}).success).toBe(false)
})
it('allows expired drafts but requires a future end to publish them',()=>{
 const expired={...input,starts_at:'2020-01-01T00:00:00Z',ends_at:'2021-01-01T00:00:00Z'}
 expect(flashSaleSchema.safeParse(expired).success).toBe(true)
 expect(flashSaleSchema.safeParse({...expired,lifecycle:'published'}).success).toBe(false)
})
it('uses the same cheapest available variant for cards, price ranges and sorting',()=>{
 const p={...product,name:'Milani',product_variants:[{...variant,stock:5},{...variant,id:'sold-out',price:100,stock:0}]}
 expect(productFlashPricing(p,[sale()],now)).toMatchObject({salePrice:600,variant:{id:'v'}})
 expect(pricedFlashCatalog([p],[sale()],now,{max:500})).toEqual([])
 const other={...p,id:'other',name:'RELOVE',product_variants:[{...variant,id:'other-v',price:900,stock:2}]}
 expect(pricedFlashCatalog([p,other],[sale()],now,{sort:'price_asc'}).map(p=>p.id)).toEqual(['other','p'])
})
it('updates price-range membership after a campaign boundary without fetching products again',()=>{
 const p={...product,product_variants:[{...variant,stock:5}]}
 expect(pricedFlashCatalog([p],[sale()],now,{max:700})).toHaveLength(1)
 expect(pricedFlashCatalog([p],[sale()],Date.parse(sale().ends_at),{max:700})).toHaveLength(0)
})
