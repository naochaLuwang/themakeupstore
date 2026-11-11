'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { calculateOrderEdit, finishEditSettlement, loadOrderEditContext } from '@/lib/order-edit-server'
import { requestFingerprint, paymentClient } from '@/lib/verified-payment'
import type { EditRequest } from '@/lib/order-edit'
import { notifyBackInStock } from './back-in-stock-notify'
import { variantFlashPricing, type FlashSaleRow } from '@/lib/flash-sale-helper'

const requestSchema = z
  .object({
    orderId: z.string().uuid(),
    revision: z.string().regex(/^[a-f0-9]{32}$/),
    pricingMode: z.enum(['preserve', 'current']),
    items: z
      .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(1000) }))
      .min(1)
      .max(100),
  })
  .refine(
    (r) => new Set(r.items.map((i) => i.variantId)).size === r.items.length,
    'Duplicate product variants'
  )
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Could not complete the request. Retry the same action.'
function refreshOrder(id: string) {
  for (const path of [
    '/admin/orders',
    `/admin/orders/${id}`,
    `/admin/orders/${id}/edit`,
    `/profile/orders/${id}`,
    `/track/${id}`,
    '/admin/products',
  ])
    revalidatePath(path)
}

export async function getOrderEdit(orderId: string) {
  const { supabase } = await requireAdmin()
  try {
    return {
      success: true as const,
      context: await loadOrderEditContext(supabase, z.string().uuid().parse(orderId)),
    }
  } catch (error) {
    return { success: false as const, message: message(error) }
  }
}

export async function previewOrderEdit(input: EditRequest) {
  const { supabase } = await requireAdmin()
  try {
    const result = await calculateOrderEdit(supabase, requestSchema.parse(input))
    return { success: true as const, quote: result.quote, reviewHash: result.reviewHash }
  } catch (error) {
    return { success: false as const, message: message(error) }
  }
}

export async function saveOrderEdit(
  input: EditRequest & { reason: string; requestKey: string; reviewHash: string }
) {
  const { supabase, user } = await requireAdmin()
  try {
    const request = requestSchema.parse(input)
    const reason = z.string().trim().min(3).max(1000).parse(input.reason)
    const key = z.string().uuid().parse(input.requestKey)
    const reviewHash = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(input.reviewHash)
    const hash = requestFingerprint({ request, reason, reviewHash })
    // Successful saves must survive a lost response and the resulting revision change.
    const prior = await supabase
      .from('order_amendments')
      .select('order_id,request_hash,actor_id')
      .eq('request_key', key)
      .maybeSingle()
    if (prior.error) throw new Error(prior.error.message)
    if (prior.data) {
      if (
        prior.data.order_id !== request.orderId ||
        prior.data.request_hash !== hash ||
        prior.data.actor_id !== user.id
      )
        throw new Error('This save key was already used for different changes.')
      return { success: true as const, context: await loadOrderEditContext(supabase, request.orderId) }
    }
    const result = await calculateOrderEdit(supabase, request)
    if (result.reviewHash !== reviewHash)
      return {
        success: false as const,
        message: 'Prices or offers changed. Review the updated total before saving.',
        quote: result.quote,
        reviewHash: result.reviewHash,
      }
    const oldIds = [
      ...new Set(
        result.context.order.order_items.flatMap((i) => (i.product_variant_id ? [i.product_variant_id] : []))
      ),
    ]
    const before = oldIds.length
      ? await supabase.from('product_variants').select('id,stock').in('id', oldIds)
      : { data: [] }
    const { error } = await supabase.rpc('commit_order_amendment', {
      p_order_id: request.orderId,
      p_key: key,
      p_hash: hash,
      p_actor: user.id,
      p_reason: reason,
      p_revision: request.revision,
      p_variants: result.ids,
      p_catalog_revision: result.catalogRevision,
      p_quote: result.quote,
    })
    if (error) throw new Error(error.message)
    refreshOrder(request.orderId)
    try {
      const zero = (before.data || []).filter((v) => Number(v.stock) <= 0).map((v) => v.id)
      if (zero.length) {
        const after = await supabase.from('product_variants').select('id,stock').in('id', zero)
        await Promise.all(
          (after.data || []).filter((v) => Number(v.stock) > 0).map((v) => notifyBackInStock(v.id))
        )
      }
    } catch (error) {
      console.warn('Order amendment restock notification failed:', error)
    }
    return { success: true as const, context: await loadOrderEditContext(supabase, request.orderId) }
  } catch (error) {
    return { success: false as const, message: message(error) }
  }
}

export async function reopenOrderPacking(orderId: string, revision: string, reason: string) {
  const { supabase, user } = await requireAdmin()
  try {
    const { error } = await supabase.rpc('reopen_order_packing', {
      p_order_id: z.string().uuid().parse(orderId),
      p_revision: z
        .string()
        .regex(/^[a-f0-9]{32}$/)
        .parse(revision),
      p_actor: user.id,
      p_reason: z.string().trim().min(3).max(1000).parse(reason),
    })
    if (error) throw new Error(error.message)
    refreshOrder(orderId)
    return { success: true as const, context: await loadOrderEditContext(supabase, orderId) }
  } catch (error) {
    return { success: false as const, message: message(error) }
  }
}

export async function settleOrderEdit(input: {
  orderId: string
  requestKey: string
  kind: 'payment' | 'refund'
  method: 'cash' | 'upi' | 'bank' | 'razorpay'
  amount: number
  reason: string
  reference: string
}) {
  const { supabase, user } = await requireAdmin()
  try {
    const data = z
      .object({
        orderId: z.string().uuid(),
        requestKey: z.string().uuid(),
        kind: z.enum(['payment', 'refund']),
        method: z.enum(['cash', 'upi', 'bank', 'razorpay']),
        amount: z.number().finite().positive().max(100000000),
        reason: z.string().trim().min(3).max(1000),
        reference: z.string().trim().max(200),
      })
      .parse(input)
    if (data.method === 'razorpay') {
      const context = await loadOrderEditContext(supabase, data.orderId)
      // Replays proceed directly to the provider's idempotent refund endpoint.
      if (!context.settlements.some((s) => s.request_key === data.requestKey)) {
        if (!context.order.razorpay_payment_id) throw new Error('No original Razorpay payment is attached.')
        const payment = await paymentClient().payments.fetch(context.order.razorpay_payment_id)
        if (data.amount > (Number(payment.amount) - Number(payment.amount_refunded || 0)) / 100)
          throw new Error(
            'This exceeds the remaining original Razorpay payment. Refund the additional receipt through its actual payment method.'
          )
      }
    }
    const reserved = await supabase.rpc('reserve_order_edit_settlement', {
      p_order_id: data.orderId,
      p_key: data.requestKey,
      p_actor: user.id,
      p_kind: data.kind,
      p_method: data.method,
      p_amount: data.amount,
      p_reason: data.reason,
      p_reference: data.reference,
    })
    if (reserved.error) throw new Error(reserved.error.message)
    await finishEditSettlement(supabase, reserved.data)
    refreshOrder(data.orderId)
    return { success: true as const, context: await loadOrderEditContext(supabase, data.orderId) }
  } catch (error) {
    return { success: false as const, message: message(error) }
  }
}

export async function searchOrderEditProducts(term: string) {
  const { supabase } = await requireAdmin()
  const query = term
    .trim()
    .slice(0, 100)
    .replace(/[%_,().\\]/g, ' ')
    .trim()
  if (query.length < 2) return { success: true as const, products: [] }
  try {
    const [products, skuVariants, flash] = await Promise.all([
      supabase.from('products').select('id').ilike('name', `%${query}%`).limit(30),
      supabase.from('product_variants').select('id').ilike('sku', `%${query}%`).limit(30),
      supabase.from('flash_sales').select('*').eq('is_active', true).gte('ends_at', new Date().toISOString()),
    ])
    if (products.error || skuVariants.error || flash.error) throw new Error('Could not search the catalog.')
    const conditions = [
      products.data?.length ? `product_id.in.(${products.data.map((p) => p.id).join(',')})` : '',
      skuVariants.data?.length ? `id.in.(${skuVariants.data.map((v) => v.id).join(',')})` : '',
    ].filter(Boolean)
    if (!conditions.length) return { success: true as const, products: [] }
    const result = await supabase
      .from('product_variants')
      .select(
        'id,product_id,title,sku,price,stock,image_url,discount_type,discount_value,products(id,name,brand,category_id,thumbnail_url,discount_type,discount_value)'
      )
      .or(conditions.join(','))
      .order('product_id')
      .order('title')
      .limit(100)
    if (result.error) throw new Error(result.error.message)
    const categories = await supabase
      .from('product_categories')
      .select('product_id,category_id')
      .in('product_id', [...new Set((result.data || []).map((v) => v.product_id))])
    if (categories.error) throw new Error('Could not verify product categories.')
    return {
      success: true as const,
      products: (result.data || []).flatMap((v) => {
        const product = v.products as unknown as {
          id: string
          name: string
          brand: string
          category_id: string
          thumbnail_url: string
          discount_type: 'percentage' | 'amount' | 'none'
          discount_value: number
        } | null
        if (!product) return []
        const categoryIds = [
          ...new Set(
            [
              product.category_id,
              ...(categories.data || [])
                .filter((c) => c.product_id === v.product_id)
                .map((c) => c.category_id),
            ].filter(Boolean)
          ),
        ]
        const pricing = variantFlashPricing(
          v,
          { ...product, categoryIds },
          (flash.data as FlashSaleRow[]) || []
        )
        return [
          {
            variantId: v.id,
            productId: v.product_id,
            name: product.name,
            variantTitle: v.title || 'Default',
            sku: v.sku || '',
            price: pricing.salePrice,
            mrp: Number(v.price),
            stock: Number(v.stock),
            image: v.image_url || product.thumbnail_url || '',
          },
        ]
      }),
    }
  } catch (error) {
    return { success: false as const, message: message(error), products: [] }
  }
}
