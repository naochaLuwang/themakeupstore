// @vitest-environment node
import {expect,it} from 'vitest'
import {previewFlashCampaign} from './flash-sale-preview'
import {emptyFlashTargets,type FlashSaleRow} from './flash-sale-helper'
import type {FlashSaleInput,FlashProduct} from './flash-sale-admin'
const product:FlashProduct={id:'p',name:'Lipstick',brand:'Milani',category_id:null,product_categories:[{category_id:'cat'}],discount_type:'percentage',discount_value:20,product_variants:[{id:'v',title:'Rose',price:1000,stock:5,discount_type:'none',discount_value:0},{id:'other',title:'Red',price:500,stock:2,discount_type:'none',discount_value:0}]}
const input:FlashSaleInput={name:'Campaign',label:'',scope:'all',target_config:emptyFlashTargets(),discount_type:'percentage',discount_value:40,starts_at:'2026-01-01T00:00:00Z',ends_at:'2099-01-01T00:00:00Z',lifecycle:'draft'}
it('previews actual variant original, normal and payable prices',()=>{
 const p=previewFlashCampaign(input,[product],[],[])
 expect(p).toMatchObject({productCount:1,variantCount:2})
 expect(p.rows[0]).toMatchObject({mrp:1000,normal:800,final:600})
 expect(p.rows[1]).toMatchObject({mrp:500,normal:400,final:300})
})
it('counts exact selected variants and applies exclusions',()=>{
 const target_config={...emptyFlashTargets(),variant_ids:[{product_id:'p',variant_id:'v'}]}
 expect(previewFlashCampaign({...input,scope:'product',target_config},[product],[],[]).variantCount).toBe(1)
 expect(previewFlashCampaign({...input,target_config:{...target_config,exclude_product_ids:['p']}},[product],[],[]).variantCount).toBe(0)
})
it('warns about better normal prices and potential overlapping campaigns',()=>{
 const campaign:FlashSaleRow={...input,id:'other-sale',name:'Other sale',product_id:null,category_id:null,brand:null,is_active:true,lifecycle:'published',discount_type:'fixed',discount_value:300}
 const p=previewFlashCampaign({...input,discount_value:10},[product],[campaign],[])
 expect(p.betterNormalCount).toBe(2);expect(p.overlappingCampaigns).toEqual(['Other sale'])
 expect(p.rows[0].final).toBe(700)
})
it('shows three-unit BXGY examples using the configured replacement prices',()=>{
 const p=previewFlashCampaign(input,[product],[],[{id:'bxgy',name:'B2G1',is_active:true,buy_type:'specific_brands',brands:['Milani'],products:[],categories:[],buy_quantity:2,get_type:'cheapest_free',get_discount_type:'free',get_discount_value:100,pricing_mode:'replace_discounts'}])
 expect(p.rows[0]).toMatchObject({bxgy:true,replaceBXGY:true,threeUnitTotal:2000})
})
