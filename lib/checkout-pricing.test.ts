// @vitest-environment node
import { expect, it } from 'vitest'
import { calculateBXGY, evaluateGiftRules, type BXGYRule, type GiftRule } from './promotion-engine'
import { positiveQuantity, type PricedItem } from './checkout-pricing'
const item=(variantId:string,price:number,quantity:number,productId='product'):PricedItem=>({variantId,price,quantity,productId,categoryId:'cat',categoryIds:['cat','cat2'],brand:'brand',name:'Product',variantTitle:'',mrp:price,stock:100,image:''})
const rule=(patch:Partial<BXGYRule>={}):BXGYRule=>({id:'rule',buy_type:'specific_products',buy_quantity:2,get_type:'cheapest_free',get_product_id:null,get_variant_id:null,get_discount_type:'free',get_discount_value:100,max_per_order:null,is_active:true,products:['product'],categories:[],brands:[],...patch})
it.each([[2,0],[3,100],[5,100],[6,200],[9,300]])('Buy 2 Get 1 with %i items saves %i', (quantity,saving)=>{expect(calculateBXGY([item('a',100,quantity)],[rule()]).discount).toBe(saving)})
it('discounts the cheapest units and repeats even when an old rule carried a one-use cap',()=>{
 expect(calculateBXGY([item('a',100,4),item('b',50,2)],[rule({max_per_order:1})]).discount).toBe(100)
})
it('does not reuse qualifying units across overlapping campaigns',()=>{
 expect(calculateBXGY([item('a',100,3)],Array.from({length:5},(_,i)=>rule({id:`r${i}`}))).discount).toBe(100)
})
it('allows disjoint qualifying campaigns in the same order',()=>{
 expect(calculateBXGY([item('a',100,3),item('b',50,3,'other')],[rule(),rule({id:'other',products:['other']})]).discount).toBe(150)
})
it('selects the larger saving deterministically when campaigns overlap',()=>{
 const mixed=[item('a',100,2),item('b',50,1,'other')]
 expect(calculateBXGY(mixed,[rule({id:'smaller',buy_type:'specific_categories',categories:['cat']}),rule({id:'larger',buy_type:'specific_brands',brands:['brand']})]).discount).toBe(50)
})
it('does not silently turn unsupported partial or separate rewards into free products',()=>{
 expect(calculateBXGY([item('a',100,9)],[rule({get_type:'specific_product',get_product_id:'gift'}),rule({get_discount_type:'percentage',get_discount_value:50})]).discount).toBe(0)
})
it('rejects inactive, exhausted, expired, future and previously used rules',()=>{
 const rules=[rule({is_active:false}),rule({usage_limit:1,used_count:1}),rule({expires_at:'2020-01-01'}),rule({starts_at:'2099-01-01'}),rule({once_per_user:true})]
 expect(calculateBXGY([item('a',100,9)],rules,new Set(['rule'])).discount).toBe(0)
})
it('matches canonical category junctions and brands',()=>{
 expect(calculateBXGY([item('a',100,3)],[rule({buy_type:'specific_categories',categories:['cat2']})]).discount).toBe(100)
 expect(calculateBXGY([item('a',100,3)],[rule({buy_type:'specific_brands',brands:['brand']})]).discount).toBe(100)
})
it('pools selected brands and chooses the cheapest original price when replacing discounts',()=>{
 const items=[{...item('milani',400,1),mrp:1000,brand:'Milani'}, {...item('relove',720,1),mrp:900,brand:'RELOVE'}, {...item('forever',640,1),mrp:800,brand:'FOREVER52'}]
 const result=calculateBXGY(items,[rule({buy_type:'specific_brands',brands:['Milani','RELOVE','FOREVER52'],pricing_mode:'replace_discounts'})])
 expect(result.discounts).toMatchObject([{variant_id:'forever',free_quantity:1,discount_amount:800}])
 expect(result.allocations.reduce((n,a)=>n+a.quantity*a.unitPrice,0)-result.discount).toBe(1900)
})
it.each([[2,1600,0],[3,3000,1000],[4,3800,1000],[5,4600,1000],[6,6000,2000],[9,9000,3000]])('reprices only complete sets for %i identical units', (quantity,gross,discount)=>{
 const result=calculateBXGY([{...item('a',800,quantity),mrp:1000}],[rule({pricing_mode:'replace_discounts'})])
 const consumed=result.allocations.reduce((n,a)=>n+a.quantity,0)
 const subtotal=result.allocations.reduce((n,a)=>n+a.quantity*a.unitPrice,0)+(quantity-consumed)*800
 expect(subtotal).toBe(gross);expect(result.discount).toBe(discount)
})
it('applies replacement even when normal discounts would cost less',()=>{
 const result=calculateBXGY([{...item('a',600,3),mrp:1000}],[rule({pricing_mode:'replace_discounts'})])
 expect(result.promotions).toHaveLength(1)
 expect(result.allocations.reduce((n,a)=>n+a.quantity*a.unitPrice,0)-result.discount).toBe(2000)
})
it('takes the two cheapest original-price units across all six eligible units',()=>{
 const items=[100,200,300,400,500,600].map((mrp,i)=>({...item(String(i),mrp/2,1),mrp}))
 const result=calculateBXGY(items,[rule({pricing_mode:'replace_discounts'})])
 expect(result.discounts.map(d=>d.original_price)).toEqual([100,200])
 expect(result.allocations.reduce((n,a)=>n+a.quantity*a.unitPrice,0)-result.discount).toBe(1800)
})
it('keeps the highest-priced paid units in a replacement set and discounts the remaining extra normally',()=>{
 const items=[100,200,300,400].map((mrp,i)=>({...item(String(i),mrp*0.8,1),mrp}))
 const result=calculateBXGY(items,[rule({pricing_mode:'replace_discounts'})])
 expect(result.allocations.map(a=>a.variantId).sort()).toEqual(['0','2','3'])
})
it('combination mode keeps markdowns and uses the cheapest selling price',()=>{
 const items=[{...item('a',400,1),mrp:1000},{...item('b',720,1),mrp:900},{...item('c',640,1),mrp:800}]
 const result=calculateBXGY(items,[rule({pricing_mode:'combine_discounts'})])
 expect(result.discounts).toMatchObject([{variant_id:'a',discount_amount:400}])
 expect(result.allocations.reduce((n,a)=>n+a.quantity*a.unitPrice,0)-result.discount).toBe(1360)
})
const gift=(patch:Partial<GiftRule>={}):GiftRule=>({id:'gift',is_active:true,trigger_type:'cart_total',trigger_threshold:2000,gift_product_id:null,gift_product_ref_id:'gift-product',gift_variant_id:null,gift_quantity:1,products:[],categories:[],brands:[],...patch})
it('uses selling prices before BXGY, not MRP, to qualify a fixed gift',()=>{
 expect(evaluateGiftRules([item('a',800,2)],[gift()]).qualifying).toHaveLength(0)
 expect(evaluateGiftRules([item('a',800,3)],[gift()]).qualifying).toHaveLength(1)
 expect(calculateBXGY([item('a',800,3)],[rule()]).discount).toBe(800)
})
it('uses the target quantity rather than gift quantity for targeted gifts',()=>{
 expect(evaluateGiftRules([item('a',100,2)],[gift({trigger_type:'specific_products',trigger_threshold:3,products:['product']})]).qualifying).toHaveLength(0)
})
it.each([0,-1,1.5,Infinity,NaN,'2',1001])('rejects invalid quantity %s',value=>{expect(()=>positiveQuantity(value)).toThrow('Invalid item quantity')})
