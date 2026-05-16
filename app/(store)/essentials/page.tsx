import { fetchEssentialsInitialData, fetchEssentialsProducts } from "./_actions/essentials-actions"
import EssentialsClient from "./essentials-client"
import { notFound } from "next/navigation"

export default async function EssentialsPage() {
    let initialData

    try {
        initialData = await fetchEssentialsInitialData()
    } catch (e) {
        return notFound()
    }

    const { parentId, subcategories, categoryIds } = initialData

    const { products, hasMore } = await fetchEssentialsProducts({
        page: 0,
        categoryIds,
        parentId,
    })

    return (
        <EssentialsClient
            initialSubcategories={subcategories}
            initialProducts={products}
            initialHasMore={hasMore}
            categoryIds={categoryIds}
            parentId={parentId}
        />
    )
}
