import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const q = searchParams.get("q") || ""

        if (q.length < 2) {
            return NextResponse.json({ products: [] })
        }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from("products")
            .select("id, name, thumbnail_url")
            .ilike("name", `%${q}%`)
            .order("name", { ascending: true })
            .limit(10)

        if (error) {
            return NextResponse.json({ products: [] })
        }

        const products = (data || []).map((p: { id: string; name: string; thumbnail_url: string | null }) => ({
            id: p.id,
            product_name: p.name,
            thumbnail_url: p.thumbnail_url,
            category_name: null,
        }))

        return NextResponse.json({ products })
    } catch {
        return NextResponse.json({ products: [] })
    }
}
