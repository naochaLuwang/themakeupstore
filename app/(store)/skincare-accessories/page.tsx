"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import SkincareAccessoriesClient from "./skincare-accessories-client"
import { SignatureLoader } from "@/components/store/signature-loader"

const PAGE_SIZE = 20;

export default function SkincareAccessoriesPage() {
    const [subcategories, setSubcategories] = React.useState<any[]>([])
    const [allProducts, setAllProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [loadingMore, setLoadingMore] = React.useState(false)
    const [page, setPage] = React.useState(0)
    const [hasMore, setHasMore] = React.useState(true)

    const [categoryIds, setCategoryIds] = React.useState<string[]>([])
    const [linkedProductIds, setLinkedProductIds] = React.useState<string[]>([])

    const supabase = createClient()

    React.useEffect(() => {
        async function getInitialData() {
            try {
                setLoading(true)

                const { data: parents } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .in('slug', ['skincare', 'accessories'])

                if (!parents || parents.length === 0) {
                    setLoading(false);
                    return;
                }

                const parentIds = parents.map(p => p.id)

                const { data: subs } = await supabase
                    .from('categories')
                    .select('id, name, slug, image_url')
                    .in('parent_id', parentIds)
                    .order('name', { ascending: true })

                if (subs) setSubcategories(subs)

                const cIds = [...parentIds, ...(subs?.map(s => s.id) || [])]
                setCategoryIds(cIds)

                const { data: junction } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .in('category_id', cIds)

                const lpIds = Array.from(new Set((junction?.map(j => j.product_id) || []).filter(id => !!id)))
                setLinkedProductIds(lpIds)

                await fetchProducts(0, cIds, lpIds)
            } catch (e) {
                console.error("Skincare & Accessories Initial Load Error:", e)
            } finally {
                setLoading(false)
            }
        }
        getInitialData()
    }, [supabase])

    async function fetchProducts(pageNum: number, cIds: string[], lpIds: string[]) {
        const from = pageNum * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        let query = supabase
            .from('products')
            .select('*, product_variants(*)')
            .eq('status', 'active')
            .range(from, to)
            .order('created_at', { ascending: false })

        if (lpIds.length > 0 && cIds.length > 0) {
            query = query.or(`category_id.in.(${cIds.join(',')}),id.in.(${lpIds.join(',')})`)
        } else if (cIds.length > 0) {
            query = query.in('category_id', cIds)
        } else if (lpIds.length > 0) {
            query = query.in('id', lpIds)
        }

        const { data: products } = await query

        if (pageNum === 0) {
            setAllProducts(products || [])
        } else {
            setAllProducts(prev => [...prev, ...(products || [])])
        }

        setHasMore((products || []).length === PAGE_SIZE)
    }

    const loadMore = async () => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        const nextPage = page + 1
        await fetchProducts(nextPage, categoryIds, linkedProductIds)
        setPage(nextPage)
        setLoadingMore(false)
    }

    return (
        <>
            <SignatureLoader loading={loading} text="The Makeup Store / Loading Skincare & Accessories" />
            {!loading && (
                <SkincareAccessoriesClient
                    initialSubcategories={subcategories}
                    initialProducts={allProducts}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onLoadMore={loadMore}
                />
            )}
        </>
    )
}