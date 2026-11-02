import { z } from 'zod'
import { emptyFlashTargets, flashTargets, type FlashSaleRow, type FlashTargets } from '@/lib/flash-sale-helper'
const ids = z.array(z.string().uuid()).max(1000).default([]).transform(v => [...new Set(v)])
const brands = z.array(z.string().trim().min(1).max(100)).max(100).default([]).transform(v => [...new Set(v)])
export const flashTargetsSchema = z.object({
  product_ids: ids, variant_ids: z.array(z.object({ product_id: z.string().uuid(), variant_id: z.string().uuid() })).max(1000).default([])
    .transform(v => [...new Map(v.map(x => [x.variant_id, x])).values()]),
  category_ids: ids, brands, exclude_product_ids: ids, exclude_variant_ids: ids, exclude_category_ids: ids, exclude_brands: brands,
})
export const flashSaleSchema = z.object({
  name: z.string().trim().min(1, 'Enter a campaign name').max(120), label: z.string().trim().max(120).default(''),
  scope: z.enum(['product', 'category', 'brand', 'all']), target_config: flashTargetsSchema,
  discount_type: z.enum(['percentage', 'fixed']), discount_value: z.number().finite().positive().max(100000000),
  starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }),
  lifecycle: z.enum(['draft', 'published', 'paused', 'ended']).default('draft'),
}).superRefine((sale, ctx) => {
  if (Date.parse(sale.ends_at) <= Date.parse(sale.starts_at)) ctx.addIssue({ code: 'custom', path: ['ends_at'], message: 'End time must be after start time' })
  if (sale.discount_type === 'percentage' && sale.discount_value > 100) ctx.addIssue({ code: 'custom', path: ['discount_value'], message: 'Percentage discount cannot exceed 100%' })
  const t = sale.target_config
  if ((sale.scope === 'product' && !t.product_ids.length && !t.variant_ids.length) ||
      (sale.scope === 'category' && !t.category_ids.length) || (sale.scope === 'brand' && !t.brands.length))
    ctx.addIssue({ code: 'custom', path: ['target_config'], message: 'Select at least one target' })
  if (sale.lifecycle === 'published' && Date.parse(sale.ends_at) <= Date.now()) ctx.addIssue({ code: 'custom', path: ['ends_at'], message: 'Choose a future end time before publishing' })
})
export type FlashSaleInput = z.infer<typeof flashSaleSchema>
export interface FlashVariant { id: string; title: string; price: number; stock: number; discount_type: string | null; discount_value: number | null }
export interface FlashProduct { id: string; name: string; brand: string | null; category_id: string | null; discount_type: string | null;
  discount_value: number | null; thumbnail_url?: string | null; status?: string; product_categories: { category_id: string }[]; product_variants: FlashVariant[] }
export interface FlashCategory { id: string; name: string }
export function normalizeFlashInput(row: FlashSaleRow): FlashSaleInput {
  return { name: row.name || row.label || 'Flash sale', label: row.label || '', scope: row.scope as FlashSaleInput['scope'],
    target_config: flashTargets(row), discount_type: row.discount_type as FlashSaleInput['discount_type'], discount_value: Number(row.discount_value),
    starts_at: row.starts_at, ends_at: row.ends_at, lifecycle: row.lifecycle || (row.is_active ? 'published' : 'paused') }
}
export function normalizedTargets(input: FlashSaleInput): FlashTargets {
  const t = input.target_config
  return { ...emptyFlashTargets(), ...t,
    product_ids: input.scope === 'product' ? t.product_ids : [], variant_ids: input.scope === 'product' ? t.variant_ids.filter(v => !t.product_ids.includes(v.product_id)) : [],
    category_ids: input.scope === 'category' ? t.category_ids : [], brands: input.scope === 'brand' ? t.brands : [] }
}
