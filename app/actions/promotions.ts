'use server'

import { requireAdmin } from '@/lib/admin'
import { bxgyAdminSchema, freeGiftAdminSchema } from '@/lib/promotion-admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { PROMOTION_CACHE_TAG } from '@/lib/promotion-data'

async function saveBXGY(id:string|null,input:unknown) {
  const {supabase}=await requireAdmin()
  const parsed=bxgyAdminSchema.safeParse(input)
  if(!parsed.success)throw new Error(parsed.error.issues.map(i=>i.message).join('. '))
  const {buy_product_ids,buy_category_ids,buy_brands,...rule}=parsed.data
  const {data,error}=await supabase.rpc('save_promotion_rule',{p_kind:'bxgy',p_id:id,
    p_rule:{...rule,get_product_id:null,get_variant_id:null,apply_to:'all',max_per_order:null},
    p_products:rule.buy_type==='specific_products'?buy_product_ids:[],p_categories:rule.buy_type==='specific_categories'?buy_category_ids:[],p_brands:rule.buy_type==='specific_brands'?buy_brands:[]})
  if(error)throw new Error(error.message)
  revalidateTag(PROMOTION_CACHE_TAG,{expire:0});revalidatePath('/admin/bxgy')
  return data
}
async function saveGift(id:string|null,input:unknown) {
  const {supabase}=await requireAdmin()
  const parsed=freeGiftAdminSchema.safeParse(input)
  if(!parsed.success)throw new Error(parsed.error.issues.map(i=>i.message).join('. '))
  const {qualifying_product_ids,qualifying_category_ids,qualifying_brands,...rule}=parsed.data
  const {data,error}=await supabase.rpc('save_promotion_rule',{p_kind:'gift',p_id:id,
    p_rule:{...rule,gift_product_id:rule.gift_product_id||null,gift_product_ref_id:rule.gift_product_ref_id||null,gift_variant_id:rule.gift_variant_id||null,apply_to:'all',max_per_order:1},
    p_products:rule.trigger_type==='specific_products'?qualifying_product_ids:[],p_categories:rule.trigger_type==='specific_categories'?qualifying_category_ids:[],p_brands:rule.trigger_type==='specific_brands'?qualifying_brands:[]})
  if(error)throw new Error(error.message)
  revalidateTag(PROMOTION_CACHE_TAG,{expire:0});revalidatePath('/admin/free-gifts')
  return data
}
export async function createBXGY(input:unknown){return saveBXGY(null,input)}
export async function updateBXGY(id:string,input:unknown){return saveBXGY(id,input)}
export async function createFreeGift(input:unknown){return saveGift(null,input)}
export async function updateFreeGift(id:string,input:unknown){return saveGift(id,input)}
export async function deleteBXGY(id:string){const {supabase}=await requireAdmin();const {error}=await supabase.from('buy_x_get_y').delete().eq('id',id);if(error)throw new Error(error.message);revalidateTag(PROMOTION_CACHE_TAG,{expire:0});revalidatePath('/admin/bxgy')}
export async function deleteFreeGift(id:string){const {supabase}=await requireAdmin();const {error}=await supabase.from('free_gifts').delete().eq('id',id);if(error)throw new Error(error.message);revalidateTag(PROMOTION_CACHE_TAG,{expire:0});revalidatePath('/admin/free-gifts')}
export async function toggleBXGYStatus(id:string,currentStatus:boolean){const {supabase}=await requireAdmin();const {error}=await supabase.from('buy_x_get_y').update({is_active:!currentStatus}).eq('id',id);if(error)throw new Error(error.message);revalidateTag(PROMOTION_CACHE_TAG,{expire:0});revalidatePath('/admin/bxgy')}
export async function toggleFreeGiftStatus(id:string,currentStatus:boolean){const {supabase}=await requireAdmin();const {error}=await supabase.from('free_gifts').update({is_active:!currentStatus}).eq('id',id);if(error)throw new Error(error.message);revalidateTag(PROMOTION_CACHE_TAG,{expire:0});revalidatePath('/admin/free-gifts')}
