import { createClient } from "@/utils/supabase/server"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""

    if (q.length < 2) {
        return Response.json({ products: [] })
    }

    const supabase = await createClient()

    const { data } = await supabase
        .from("products")
        .select("id, name, thumbnail_url")
        .ilike("name", `%${q}%`)
        .order("name", { ascending: true })
        .limit(10)

    const products = (data || []).map((p: any) => ({
        id: p.id,
        product_name: p.name,
        thumbnail_url: p.thumbnail_url,
        category_name: null,
    }))

    return Response.json({ products })
}
