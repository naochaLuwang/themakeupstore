import { createClient } from "@/utils/supabase/server"
import TagsManager from "./tags-manager"

export default async function TagsPage() {
    const supabase = await createClient()

    const [{ data: products }, { data: categories }] = await Promise.all([
        supabase
            .from("products")
            .select("id, name, brand, tag, thumbnail_url, product_categories(category_id)")
            .order("name"),
        supabase.from("categories").select("id, name").order("name"),
    ])

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Tags</h1>
                <p className="text-sm text-slate-500">Bulk manage product tags (badges on product cards)</p>
            </div>

            <TagsManager initialProducts={products || []} categories={categories || []} />
        </div>
    )
}
