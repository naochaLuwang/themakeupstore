"use server"

import { createClient } from "@/utils/supabase/server"

const PAGE_SIZE = 20

export async function fetchEssentialsInitialData() {
    const supabase = await createClient()

    // 1. Fetch parent category 'essentials'
    const { data: parent, error: parentError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('slug', 'essentials')
        .single()

    if (parentError || !parent) {
        throw new Error("Category 'essentials' not found")
    }

    // 2. Fetch subcategories
    const { data: subs } = await supabase
        .from('categories')
        .select('id, name, slug, image_url')
        .eq('parent_id', parent.id)
        .order('name', { ascending: true })

    const subcategories = subs || []

    const cIds = [parent.id, ...(subs?.map(s => s.id) || [])]

    return {
        parentId: parent.id,
        subcategories,
        categoryIds: cIds,
    }
}

export async function fetchEssentialsProducts({
    page,
    categoryIds,
    parentId,
}: {
    page: number
    categoryIds: string[]
    parentId: string
}) {
    const supabase = await createClient()
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data: products, error } = await supabase
        .from('products')
        .select('*, product_variants(*), product_categories!inner(category_id)')
        .in('product_categories.category_id', categoryIds)
        .eq('status', 'active')
        .range(from, to)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching essentials products:", error)
        return { products: [], hasMore: false }
    }

    const seen = new Set<string>()
    const deduped = (products || []).filter((p: any) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
    })

    const processed = deduped.map((product: any) => ({
        ...product,
        category_id: product.category_id || parentId
    }))

    return {
        products: processed,
        hasMore: processed.length === PAGE_SIZE,
    }
}
