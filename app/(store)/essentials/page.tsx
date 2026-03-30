"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import EssentialsClient from "./essentials-client"
import { motion } from "framer-motion"
import { SignatureLoader } from "@/components/store/signature-loader"

const PAGE_SIZE = 20;

export default function EssentialPage() {
    const [subcategories, setSubcategories] = React.useState<any[]>([])
    const [allProducts, setAllProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [loadingMore, setLoadingMore] = React.useState(false)
    const [page, setPage] = React.useState(0)
    const [hasMore, setHasMore] = React.useState(true)
    
    // Cached IDs to avoid re-fetching junction table every time
    const [categoryIds, setCategoryIds] = React.useState<string[]>([])
    const [linkedProductIds, setLinkedProductIds] = React.useState<string[]>([])
    const [parentId, setParentId] = React.useState<string>("")

    const supabase = createClient()

    // 1. INITIAL FETCH (Categories & Junction)
    React.useEffect(() => {
        async function getInitialData() {
            try {
                setLoading(true)
                const { data: parent } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .eq('slug', 'essentials')
                    .single()

                if (!parent) {
                    setLoading(false);
                    return;
                }
                setParentId(parent.id)

                const { data: subs } = await supabase
                    .from('categories')
                    .select('id, name, slug, image_url')
                    .eq('parent_id', parent.id)
                    .order('name', { ascending: true })

                if (subs) setSubcategories(subs)

                const cIds = [parent.id, ...(subs?.map(s => s.id) || [])]
                setCategoryIds(cIds)

                const { data: junction } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .in('category_id', cIds)

                const lpIds = Array.from(new Set((junction?.map(j => j.product_id) || []).filter(id => !!id)))
                setLinkedProductIds(lpIds)

                // Fetch First Page
                await fetchProducts(0, cIds, lpIds, parent.id)
            } catch (e) {
                console.error("Essentials Initial Load Error:", e)
            } finally {
                setLoading(false)
            }
        }
        getInitialData()
    }, [supabase])

    // 2. PRODUCT FETCH ENGINE
    async function fetchProducts(pageNum: number, cIds: string[], lpIds: string[], pId: string) {
        const from = pageNum * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        let query = supabase
            .from('products')
            .select('*, product_variants(*)')
            .eq('status', 'active')
            .range(from, to)
            .order('created_at', { ascending: false }) // Show newest first

        if (lpIds.length > 0 && cIds.length > 0) {
            query = query.or(`category_id.in.(${cIds.join(',')}),id.in.(${lpIds.join(',')})`)
        } else if (cIds.length > 0) {
            query = query.in('category_id', cIds)
        } else if (lpIds.length > 0) {
            query = query.in('id', lpIds)
        }

        const { data: products } = await query
        
        const processed = (products || []).map(product => ({
            ...product,
            category_id: product.category_id || pId
        }))

        if (pageNum === 0) {
            setAllProducts(processed)
        } else {
            setAllProducts(prev => [...prev, ...processed])
        }

        setHasMore(processed.length === PAGE_SIZE)
    }

    const loadMore = async () => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        const nextPage = page + 1
        await fetchProducts(nextPage, categoryIds, linkedProductIds, parentId)
        setPage(nextPage)
        setLoadingMore(false)
    }

    return (
        <>
            <SignatureLoader loading={loading} text="The Makeup Store / Loading Essentials" />
            {!loading && (
                <EssentialsClient
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