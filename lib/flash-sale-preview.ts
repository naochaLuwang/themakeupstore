import type { FlashSaleInput, FlashProduct } from '@/lib/flash-sale-admin'
import { flashSaleMatchesTarget, variantFlashPricing, type FlashSaleRow } from '@/lib/flash-sale-helper'
import { calculateBXGY, matchesOffer, activeOffer, type BXGYRule } from '@/lib/promotion-engine'
export function previewFlashCampaign(input: FlashSaleInput, products: FlashProduct[], campaigns: FlashSaleRow[], bxgyRules: BXGYRule[], editingId?: string) {
  const at = Math.max(Date.now(), Date.parse(input.starts_at) || Date.now())
  const candidate: FlashSaleRow = { ...input, id: editingId || 'preview', product_id: null, category_id: null, brand: null, is_active: true, lifecycle: 'published',
    starts_at: new Date(at - 1).toISOString(), ends_at: new Date(at + 1000).toISOString() }
  const others = campaigns.filter(s=>s.id!==editingId)
  const rows = products.flatMap(product => {
    const categories = [...new Set([product.category_id,...(product.product_categories || []).map(c=>c.category_id)].filter((id):id is string=>!!id))]
    return (product.product_variants || []).filter(v=>flashSaleMatchesTarget(candidate,product.id,categories,product.brand,v.id)).map(variant=>{
      const proposed=variantFlashPricing(variant,product,[candidate],at)
      const winner=variantFlashPricing(variant,product,[candidate,...others],at)
      const overlaps=others.filter(s=>s.is_active!==false&&(!s.lifecycle||s.lifecycle==='published')&&Date.parse(s.starts_at)<Date.parse(input.ends_at)&&Date.parse(s.ends_at)>Date.parse(input.starts_at)&&flashSaleMatchesTarget(s,product.id,categories,product.brand,variant.id))
      const item={productId:product.id,variantId:variant.id,name:product.name,quantity:3,price:winner.salePrice,mrp:Number(variant.price),categoryIds:categories,brand:product.brand || ''}
      const bxgy=calculateBXGY([item],bxgyRules)
      const consumed=bxgy.allocations.reduce((sum,a)=>sum+a.quantity*a.unitPrice,0)
      const normalUnits=3-bxgy.allocations.reduce((sum,a)=>sum+a.quantity,0)
      return { productId:product.id,variantId:variant.id,name:product.name,title:variant.title,stock:variant.stock,mrp:Number(variant.price),normal:proposed.regularPrice,
        proposed:proposed.salePrice,final:winner.salePrice,betterNormal:proposed.regularPrice<=proposed.salePrice&&!proposed.isFlashSale,
        overlaps:overlaps.map(s=>s.name||s.label||'Flash sale'),threeUnitTotal:consumed+normalUnits*winner.salePrice-bxgy.discount,
        bxgy:bxgy.promotions.length>0,replaceBXGY:bxgyRules.some(r=>activeOffer(r)&&r.pricing_mode==='replace_discounts'&&matchesOffer(item,r.buy_type,r)) }
    })
  })
  return {rows,productCount:new Set(rows.map(r=>r.productId)).size,variantCount:rows.length,betterNormalCount:rows.filter(r=>r.betterNormal).length,
    overlappingCampaigns:[...new Set(rows.flatMap(r=>r.overlaps))],zeroPriceCount:rows.filter(r=>r.final===0).length}
}
