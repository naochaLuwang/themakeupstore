import * as z from 'zod';

export const concernSchema = z.object({
    name: z.string().min(2, 'Concern name must be at least 2 characters'),
    slug: z.string().min(2, 'Slug must be at least 2 characters'),
    image_url: z.string().optional().or(z.literal("")),
    product_ids: z.array(z.string()).default([]) as any,
});

export type ConcernFormValues = z.infer<typeof concernSchema>
