// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { createBXGY,updateBXGY,createFreeGift } from './promotions'
import { revalidateTag } from 'next/cache'
const mocks=vi.hoisted(()=>({admin:vi.fn(),rpc:vi.fn()}))
vi.mock('@/lib/admin',()=>({requireAdmin:mocks.admin}))
const id='00000000-0000-4000-8000-000000000001'
const base={name:'Offer',starts_at:'2026-10-01T00:00:00Z',is_active:false}
beforeEach(()=>{vi.clearAllMocks();mocks.admin.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.rpc.mockResolvedValue({data:{id},error:null})})
it('saves a repeating cheapest-free campaign with inactive state intact',async()=>{
 await createBXGY({...base,buy_type:'specific_products',buy_product_ids:[id]})
 expect(mocks.rpc).toHaveBeenCalledWith('save_promotion_rule',expect.objectContaining({p_kind:'bxgy',p_id:null,p_rule:expect.objectContaining({buy_quantity:2,get_type:'cheapest_free',get_discount_type:'free',max_per_order:null,is_active:false}),p_products:[id]}))
 expect(revalidateTag).toHaveBeenCalledWith('store-promotion-definitions',{expire:0})
})
it('replaces rule and target links through one atomic operation',async()=>{
 await updateBXGY(id,{...base,buy_type:'specific_categories',buy_category_ids:[id]})
 expect(mocks.rpc).toHaveBeenCalledTimes(1)
 expect(mocks.rpc).toHaveBeenCalledWith('save_promotion_rule',expect.objectContaining({p_id:id,p_products:[],p_categories:[id]}))
})
it.each(['replace_discounts','combine_discounts'])('saves the chosen %s mode and cross-brand pool atomically',async pricing_mode=>{
 await createBXGY({...base,buy_type:'specific_brands',buy_brands:['Milani','RELOVE'],pricing_mode})
 expect(mocks.rpc).toHaveBeenCalledWith('save_promotion_rule',expect.objectContaining({p_rule:expect.objectContaining({pricing_mode}),p_brands:['Milani','RELOVE']}))
})
it('saves one dedicated fixed gift with one source',async()=>{
 await createFreeGift({...base,gift_product_ref_id:id,gift_quantity:1,trigger_type:'cart_total',trigger_threshold:2000})
 expect(mocks.rpc).toHaveBeenCalledWith('save_promotion_rule',expect.objectContaining({p_kind:'gift',p_rule:expect.objectContaining({gift_product_id:null,gift_product_ref_id:id,gift_quantity:1,max_per_order:1})}))
})
it.each([
 {...base,buy_type:'specific_products'},
 {...base,buy_type:'specific_products',buy_product_ids:[id],buy_quantity:3},
 {...base,buy_type:'specific_products',buy_product_ids:[id],get_discount_type:'percentage',get_discount_value:50},
 {...base,buy_type:'specific_products',buy_product_ids:[id],expires_at:'2020-01-01T00:00:00Z'},
 {...base,buy_type:'specific_products',buy_product_ids:[id],usage_limit:-1},
 {...base,buy_type:'specific_products',buy_product_ids:[id],pricing_mode:'unknown'},
])('rejects invalid or unsupported BXGY settings before saving',async input=>{
 await expect(createBXGY(input)).rejects.toThrow();expect(mocks.rpc).not.toHaveBeenCalled()
})
it('rejects selecting both gift sources',async()=>{
 await expect(createFreeGift({...base,gift_product_id:id,gift_product_ref_id:id,trigger_type:'cart_total',trigger_threshold:100})).rejects.toThrow('one gift product source')
 expect(mocks.rpc).not.toHaveBeenCalled()
})
it('propagates an atomic save failure instead of reporting success',async()=>{
 mocks.rpc.mockResolvedValue({data:null,error:{message:'Target product not found'}})
 await expect(createBXGY({...base,buy_type:'specific_products',buy_product_ids:[id]})).rejects.toThrow('Target product not found')
 expect(revalidateTag).not.toHaveBeenCalled()
})
it('checks administrator authorization before preparing a campaign',async()=>{
 mocks.admin.mockRejectedValue(new Error('Admin required'))
 await expect(createBXGY({...base,buy_type:'specific_products',buy_product_ids:[id]})).rejects.toThrow('Admin required')
 expect(mocks.rpc).not.toHaveBeenCalled()
})
