'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { merchandiseQuote } from '@/lib/cart-quote'
import { quoteFingerprint } from '@/lib/verified-payment'
import { checkoutQuote, type PricingInput } from '@/lib/checkout-pricing'
import { cachedFlashSales } from '@/lib/flash-sale-cache'
import { cachedPromotionDefinitions } from '@/lib/promotion-cache'
import { loadPromotionSnapshot } from '@/lib/promotion-data'

export async function getPromotionPreview() {
  try {
    const auth = await createClient()
    const [identity, definitions, flashSales] = await Promise.all([auth.auth.getUser(), cachedPromotionDefinitions(), cachedFlashSales()])
    const previewCatalog = await loadPromotionSnapshot(await createAdminClient(), identity.data.user?.id || null, definitions)
    previewCatalog.flashSales = flashSales
    const boundaries = flashSales.flatMap(s => [s.starts_at, s.ends_at]).map(Date.parse).filter(t => t > Date.now())
    previewCatalog.expiresAt = Math.min(previewCatalog.expiresAt, ...boundaries)
    return { success: true as const, previewCatalog }
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Could not load offers' }
  }
}

// Returns public catalog/offer data only. Customer eligibility comes from the session.
export async function getOfferQuote(rawItems: unknown) {
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    const quote = await merchandiseQuote(await createAdminClient(),user?.id || null,rawItems)
    return { success:true as const,quote }
  } catch (error) {
    return { success:false as const,message:error instanceof Error ? error.message : 'Could not check offers. Please try again.' }
  }
}

export async function getCheckoutQuote(rawItems: unknown,input: PricingInput) {
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) throw new Error('Please sign in to checkout')
    const quote = await checkoutQuote(await createAdminClient(),user.id,rawItems,input)
    return { success:true as const,quote,fingerprint:quoteFingerprint(quote,input) }
  } catch (error) {
    return { success:false as const,message:error instanceof Error ? error.message : 'Could not check checkout. Please try again.' }
  }
}

export async function getPromotionBadges() {
  const {activeOffer,supportsBXGY}=await import('@/lib/promotion-engine')
  const auth=await createClient()
  const {data:{user}}=await auth.auth.getUser()
  const db=await createAdminClient()
  const [bx,fg,bp,bc,bb,gp,gc,gb]=await Promise.all([
    db.from('buy_x_get_y').select('*').eq('is_active',true),
    db.from('free_gifts').select('*,gift_product:products!free_gifts_gift_product_id_fkey(name,thumbnail_url),gift_product_ref:gift_products!free_gifts_gift_product_ref_id_fkey(name,images,price,stock,is_active)').eq('is_active',true),
    db.from('bxgy_buy_products').select('bxgy_id,product_id'),db.from('bxgy_buy_categories').select('bxgy_id,category_id'),db.from('bxgy_buy_brands').select('bxgy_id,brand'),
    db.from('free_gift_products').select('free_gift_id,product_id'),db.from('free_gift_categories').select('free_gift_id,category_id'),db.from('free_gift_brands').select('free_gift_id,brand'),
  ])
  if([bx,fg,bp,bc,bb,gp,gc,gb].some(r=>r.error))throw new Error('Could not load offer badges')
  const ids=[...(bx.data||[]),...(fg.data||[])].map(r=>r.id)
  const used=user&&ids.length?await db.from('checkout_promotion_uses').select('kind,promotion_id').eq('user_id',user.id).in('promotion_id',ids):{data:[],error:null}
  if(used.error)throw new Error('Could not check offer eligibility')
  const usedBXGY=new Set((used.data||[]).filter(r=>r.kind==='bxgy').map(r=>r.promotion_id))
  const usedGifts=new Set((used.data||[]).filter(r=>r.kind==='gift').map(r=>r.promotion_id))
  const storeIds=(fg.data||[]).map(r=>r.gift_product_id).filter(Boolean)
  const variants=storeIds.length?await db.from('product_variants').select('id,product_id,stock,is_default').in('product_id',storeIds):{data:[],error:null}
  if(variants.error)throw new Error('Could not check gift availability')
  type Badge={type:'gift'|'bogo';pricingMode?:'replace_discounts'|'combine_discounts';ruleName:string;minCartAmount?:number;giftProduct?:{name:string;thumbnail_url:string};giftQuantity?:number}
  const entries:{key:string;promo:Badge}[]=[]
  let cartTotalGift:Badge|null=null
  for(const rule of bx.data||[]){
    if(!activeOffer(rule,usedBXGY)||!supportsBXGY({...rule,products:[],categories:[],brands:[]}))continue
    const promo:Badge={type:'bogo',ruleName:rule.name || 'Buy 2 Get 1 Free',pricingMode:rule.pricing_mode || 'combine_discounts'}
    for(const row of bp.data||[])if(rule.buy_type==='specific_products'&&row.bxgy_id===rule.id)entries.push({key:row.product_id,promo})
    for(const row of bc.data||[])if(rule.buy_type==='specific_categories'&&row.bxgy_id===rule.id)entries.push({key:`cat:${row.category_id}`,promo})
    for(const row of bb.data||[])if(rule.buy_type==='specific_brands'&&row.bxgy_id===rule.id)entries.push({key:`brand:${row.brand}`,promo})
  }
  for(const rule of fg.data||[]){
    if(!activeOffer(rule,usedGifts))continue
    const ref=rule.gift_product_ref
    const available=rule.gift_product_ref_id?!!ref&&ref.is_active&&ref.stock>0:!!(variants.data||[]).find(v=>v.product_id===rule.gift_product_id&&(rule.gift_variant_id?v.id===rule.gift_variant_id:v.is_default)&&v.stock>0)
    if(!available|| (!!rule.gift_product_id&&!!rule.gift_product_ref_id))continue
    const promo:Badge={type:'gift',ruleName:rule.name,minCartAmount:rule.trigger_type==='cart_total'?Math.max(rule.trigger_threshold,rule.min_cart_amount||0):rule.min_cart_amount||undefined,
      giftProduct:ref?{name:ref.name,thumbnail_url:ref.images?.[0]||''}:rule.gift_product,giftQuantity:1}
    if(rule.trigger_type==='cart_total'){if(!cartTotalGift)cartTotalGift=promo;continue}
    for(const row of gp.data||[])if(rule.trigger_type==='specific_products'&&row.free_gift_id===rule.id)entries.push({key:row.product_id,promo})
    for(const row of gc.data||[])if(rule.trigger_type==='specific_categories'&&row.free_gift_id===rule.id)entries.push({key:`cat:${row.category_id}`,promo})
    for(const row of gb.data||[])if(rule.trigger_type==='specific_brands'&&row.free_gift_id===rule.id)entries.push({key:`brand:${row.brand}`,promo})
  }
  return {entries,cartTotalGift}
}
