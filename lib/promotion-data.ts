import type { SupabaseClient } from '@supabase/supabase-js'
import type { BXGYRule, GiftRule } from '@/lib/promotion-engine'
import type { PromotionSnapshot } from '@/lib/promotion-preview'

export const PROMOTION_CACHE_TAG = 'store-promotion-definitions'
export interface PromotionDefinitions { bxgyRules: BXGYRule[]; giftRules: GiftRule[] }

// Definitions can be cached for previews; checkout always loads them fresh.
export async function loadPromotionDefinitions(db: SupabaseClient): Promise<PromotionDefinitions> {
  const common = 'id,name,is_active,starts_at,expires_at,usage_limit,used_count,once_per_user'
  const [bx, gift] = await Promise.all([
    db.from('buy_x_get_y').select(`${common},buy_type,buy_quantity,get_type,get_discount_type,get_discount_value,pricing_mode`).eq('is_active', true),
    db.from('free_gifts').select(`${common},trigger_type,trigger_threshold,min_cart_amount,gift_product_id,gift_product_ref_id,gift_variant_id,gift_quantity`).eq('is_active', true),
  ])
  if (bx.error || gift.error) throw new Error('Could not load current offers')
  const bIds = (bx.data || []).map(r => r.id), gIds = (gift.data || []).map(r => r.id)
  const read = (table: string, key: string, field: string, ids: string[]) => ids.length
    ? db.from(table).select(`${key},${field}`).in(key, ids) : Promise.resolve({ data: [], error: null })
  const [bp, bc, bb, gp, gc, gb] = await Promise.all([
    read('bxgy_buy_products', 'bxgy_id', 'product_id', bIds), read('bxgy_buy_categories', 'bxgy_id', 'category_id', bIds), read('bxgy_buy_brands', 'bxgy_id', 'brand', bIds),
    read('free_gift_products', 'free_gift_id', 'product_id', gIds), read('free_gift_categories', 'free_gift_id', 'category_id', gIds), read('free_gift_brands', 'free_gift_id', 'brand', gIds),
  ])
  if ([bp, bc, bb, gp, gc, gb].some(r => r.error)) throw new Error('Could not load offer targets')
  const links = (res: { data: unknown }, key: string, field: string, id: string) =>
    ((res.data || []) as Record<string, string>[]).filter(r => r[key] === id).map(r => r[field])
  return {
    bxgyRules: (bx.data || []).map(r => ({ ...r, products: links(bp, 'bxgy_id', 'product_id', r.id), categories: links(bc, 'bxgy_id', 'category_id', r.id), brands: links(bb, 'bxgy_id', 'brand', r.id) })) as BXGYRule[],
    giftRules: (gift.data || []).map(r => ({ ...r, products: links(gp, 'free_gift_id', 'product_id', r.id), categories: links(gc, 'free_gift_id', 'category_id', r.id), brands: links(gb, 'free_gift_id', 'brand', r.id) })) as GiftRule[],
  }
}

// Customer eligibility and inventory are deliberately outside the shared definitions cache.
export async function loadPromotionSnapshot(db: SupabaseClient, ownerId: string | null, definitions: PromotionDefinitions): Promise<PromotionSnapshot> {
  const { bxgyRules, giftRules } = definitions
  const ids = [...bxgyRules, ...giftRules].map(r => r.id)
  const storeIds = [...new Set(giftRules.map(r => r.gift_product_id).filter((id): id is string => !!id))]
  const dedicatedIds = [...new Set(giftRules.map(r => r.gift_product_ref_id).filter((id): id is string => !!id))]
  const [used, variants, products, dedicated] = await Promise.all([
    ownerId && ids.length ? db.from('checkout_promotion_uses').select('kind,promotion_id').eq('user_id', ownerId).in('promotion_id', ids) : Promise.resolve({ data: [], error: null }),
    storeIds.length ? db.from('product_variants').select('id,product_id,title,price,stock,is_default,image_url').in('product_id', storeIds) : Promise.resolve({ data: [], error: null }),
    storeIds.length ? db.from('products').select('id,name,thumbnail_url').in('id', storeIds) : Promise.resolve({ data: [], error: null }),
    dedicatedIds.length ? db.from('gift_products').select('id,name,price,stock,is_active,images').in('id', dedicatedIds) : Promise.resolve({ data: [], error: null }),
  ])
  if ([used, variants, products, dedicated].some(r => r.error)) throw new Error('Could not check offer availability')
  const giftOptions: PromotionSnapshot['giftOptions'] = giftRules.flatMap(rule => {
    if (rule.gift_product_ref_id && !rule.gift_product_id) {
      const gift = dedicated.data?.find(g => g.id === rule.gift_product_ref_id)
      return gift?.is_active ? [{ productId: null, variantId: null, giftProductId: gift.id, ruleId: rule.id, ruleName: rule.name || 'Free Gift', quantity: 1,
        name: gift.name, mrp: Number(gift.price || 0), image: gift.images?.[0] || '', stock: gift.stock }] : []
    }
    if (!rule.gift_product_id || rule.gift_product_ref_id) return []
    const variant = variants.data?.find(v => v.product_id === rule.gift_product_id && (rule.gift_variant_id ? v.id === rule.gift_variant_id : v.is_default))
    const product = products.data?.find(p => p.id === rule.gift_product_id)
    return variant && product ? [{ productId: product.id, variantId: variant.id, giftProductId: null, ruleId: rule.id, ruleName: rule.name || 'Free Gift', quantity: 1,
      name: product.name, mrp: Number(variant.price), image: variant.image_url || product.thumbnail_url || '', stock: variant.stock }] : []
  })
  const dates = [...bxgyRules, ...giftRules].flatMap(r => [r.starts_at, r.expires_at])
    .filter((d): d is string => !!d && Date.parse(d) > Date.now()).map(d => Date.parse(d))
  return { ...definitions, ownerId, giftOptions,
    usedBXGY: (used.data || []).filter(r => r.kind === 'bxgy').map(r => r.promotion_id),
    usedGifts: (used.data || []).filter(r => r.kind === 'gift').map(r => r.promotion_id),
    expiresAt: Math.min(Date.now() + 30_000, ...dates) }
}
