import { z } from "zod";

export const PromoSchema = z.object({
    code: z.string().min(3).max(20).toUpperCase(),
    description: z.string().optional(),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.number().positive(),
    apply_to: z.enum(['all', 'specific_products', 'specific_categories']),
    min_order_amount: z.number().default(0),
    max_discount_amount: z.number().nullable().optional(),
    usage_limit: z.number().int().positive().nullable().optional(),
    once_per_user: z.boolean().default(false),
    starts_at: z.string().nullable().optional(),
    expires_at: z.string().nullable().optional(),
});

export const OrderPOSSchema = z.object({
    orderId: z.string().uuid(),
    items: z.array(z.object({
        product_id: z.string().uuid(),
        product_variant_id: z.string().uuid(),
        product_name: z.string(),
        variant_title: z.string(),
        quantity: z.number().int().positive(),
        unit_price: z.number().nonnegative(),
        mrp: z.number().nonnegative(),
        sku: z.string().optional().nullable(),
    })),
    globalDiscount: z.number().nonnegative().default(0),
    additionalCharges: z.number().nonnegative().default(0),
    additionalChargesLabel: z.string().default('Extra Charges'),
});
