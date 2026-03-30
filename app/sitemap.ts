import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createClient()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://themakeupstore.in'

    // Static routes
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
        { url: `${baseUrl}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/brands`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/new-arrivals`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ]

    // Fetch all active products
    const { data: products } = await supabase
        .from('products')
        .select('id, updated_at')
        .eq('status', 'active')

    const productRoutes: MetadataRoute.Sitemap = (products || []).map((p) => ({
        url: `${baseUrl}/products/${p.id}`,
        lastModified: new Date(p.updated_at || new Date()),
        changeFrequency: 'weekly',
        priority: 0.6,
    }))

    // Fetch all categories
    const { data: categories } = await supabase
        .from('categories')
        .select('slug')

    const categoryRoutes: MetadataRoute.Sitemap = (categories || []).map((c) => ({
        url: `${baseUrl}/categories/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
    }))

    return [...staticRoutes, ...productRoutes, ...categoryRoutes]
}
