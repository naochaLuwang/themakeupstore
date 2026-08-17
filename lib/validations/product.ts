// lib/validations/product.ts
import * as z from "zod"

export const productSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    slug: z.string().min(2, "Slug is required"),
    description: z.string().default(""),
    brand: z.string().default(""),
    tag: z.string().default(""),
    has_variants: z.boolean().default(false),
    category_ids: z.array(z.string()).default([]),
    concern_ids: z.array(z.string()).default([]),

    // Basic Product Fields
    base_price: z.coerce.number().min(0).default(0),
    stock: z.coerce.number().min(0).default(0),
    discount_type: z.enum(["none", "percentage", "amount"]).default("none"),
    discount_value: z.coerce.number().min(0).default(0),

    image_files: z.array(z.any()).default([]),
    existing_images: z.array(z.any()).default([]),

    variants: z.array(
        z.object({
            id: z.string().optional(),
            title: z.string().min(1, "Variant title required"),
            price: z.coerce.number().min(0).default(0),
            stock: z.coerce.number().min(0).default(0),
            sku: z.string().optional(),
            hex_code: z.string().nullable().default(null),
            discount_type: z.enum(["none", "percentage", "amount"]).default("none"),
            discount_value: z.coerce.number().min(0).default(0),
            variant_image_urls: z.array(z.string()).default([]),
            image_indices: z.array(z.number()).optional(),
        })
    ).default([]),
})

export type ProductFormValues = z.infer<typeof productSchema>