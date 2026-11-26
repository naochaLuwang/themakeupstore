"use server"

import { createClient } from "@/utils/supabase/server"
import { readCatalogPages } from "@/lib/catalog-pages"
import { outOfStockLast } from "@/lib/product-stock"

const PAGE_SIZE = 20

export async function fetchEssentialsInitialData() {
    const supabase = await createClient()

    // 1. Fetch parent category 'essentials'
    const { data: parent, error: parentError } = await supabase
        .from('categories')
        .select('id, name, slug').eq("is_active", true)
        .eq('slug', 'essentials')
        .single()

    if (parentError || !parent) {
        throw new Error("Category 'essentials' not found")
    }

    // 2. Fetch subcategories
    const { data: subs } = await supabase
        .from('categories')
        .select('id, name, slug, image_url').eq("is_active", true)
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
    // Partition the complete collection before choosing a scroll batch. Sorting
    // each batch alone would leave available products behind earlier sold-outs.
    const products = await readCatalogPages((start, end) => supabase
        .from('products')
        .select('*, product_variants(id, price, stock, hex_code, discount_type, discount_value), product_categories!inner(category_id)')
        .in('product_categories.category_id', categoryIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false }).order('id')
        .range(start, end))

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
        products: outOfStockLast(processed).slice(from, from + PAGE_SIZE),
        hasMore: from + PAGE_SIZE < processed.length,
    }
}
