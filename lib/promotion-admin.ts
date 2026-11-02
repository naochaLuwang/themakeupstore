import { z } from 'zod'
const ids=z.array(z.string().uuid()).max(1000).default([]).transform(a=>[...new Set(a)])
const brands=z.array(z.string().trim().min(1).max(100)).max(100).default([]).transform(a=>[...new Set(a)])
const date=z.string().datetime({offset:true})
const common={name:z.string().trim().min(1).max(120),description:z.string().max(1000).optional(),
  starts_at:date,expires_at:date.optional(),usage_limit:z.number().int().positive().max(100000000).optional(),
  once_per_user:z.boolean().default(false),is_active:z.boolean().default(true)}
const targets=z.enum(['specific_products','specific_categories','specific_brands'])
function dates(v:{starts_at:string;expires_at?:string}){return !v.expires_at||Date.parse(v.expires_at)>Date.parse(v.starts_at)}
function hasTargets(type:string,p:string[],c:string[],b:string[]){return type==='cart_total'||(type==='specific_products'?p.length>0:type==='specific_categories'?c.length>0:b.length>0)}
export const bxgyAdminSchema=z.object({...common,buy_type:targets,buy_quantity:z.literal(2).default(2),get_type:z.literal('cheapest_free').default('cheapest_free'),
  pricing_mode:z.enum(['replace_discounts','combine_discounts']).default('combine_discounts'),
  get_discount_type:z.literal('free').default('free'),get_discount_value:z.literal(100).default(100),
  buy_product_ids:ids,buy_category_ids:ids,buy_brands:brands})
  .refine(dates,'Expiry must be later than the start date')
  .refine(v=>hasTargets(v.buy_type,v.buy_product_ids,v.buy_category_ids,v.buy_brands),'Select at least one qualifying product, category, or brand')
export const freeGiftAdminSchema=z.object({...common,gift_product_id:z.string().uuid().or(z.literal('')).optional(),gift_product_ref_id:z.string().uuid().optional(),gift_variant_id:z.string().uuid().optional(),
  gift_quantity:z.literal(1).default(1),trigger_type:z.enum(['cart_total','specific_products','specific_categories','specific_brands']),
  trigger_threshold:z.number().finite().min(0).max(100000000),min_cart_amount:z.number().finite().min(0).max(100000000).nullable().optional(),
  qualifying_product_ids:ids,qualifying_category_ids:ids,qualifying_brands:brands})
  .refine(dates,'Expiry must be later than the start date')
  .refine(v=>!!v.gift_product_id!==!!v.gift_product_ref_id,'Choose exactly one gift product source')
  .refine(v=>!v.gift_variant_id||!!v.gift_product_id,'A variant must belong to a store gift product')
  .refine(v=>v.trigger_type==='cart_total'||(Number.isSafeInteger(v.trigger_threshold)&&v.trigger_threshold>=1),'The qualifying quantity must be a positive whole number')
  .refine(v=>hasTargets(v.trigger_type,v.qualifying_product_ids,v.qualifying_category_ids,v.qualifying_brands),'Select at least one qualifying product, category, or brand')
