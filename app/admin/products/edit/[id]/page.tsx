import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import ProductEditForm from "@/components/admin/product-edit-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const [productResult, categoriesResult] = await Promise.all([
        supabase
            .from("products")
            .select(`
                *,
                product_categories(category_id),
                product_images(*),
                product_variants(
                    *,
                    variant_images(*)
                )
            `)
            .eq("id", id)
            .single(),
        supabase.from("categories").select("id, name").order("name", { ascending: true }),
    ]);

    if (productResult.error || !productResult.data) return notFound();

    // product_concerns and concerns tables may not exist yet — handle gracefully
    let concernIds: string[] = []
    try {
        const { data: pc } = await supabase.from("product_concerns").select("concern_id").eq("product_id", id)
        concernIds = pc?.map(p => p.concern_id) || []
    } catch { /* table not available */ }

    let concerns: { id: string; name: string }[] = []
    try {
        const { data } = await supabase.from("concerns").select("id, name").order("name", { ascending: true })
        concerns = data || []
    } catch { /* table not available */ }

    const productData = { ...productResult.data, product_concerns: concernIds.map(cid => ({ concern_id: cid })) }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/products"
                    className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit Product</h1>
                    <p className="text-sm text-slate-500">Update inventory details</p>
                </div>
            </div>
            <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm">
                <ProductEditForm product={productData} categories={categoriesResult.data || []} concerns={concerns} />
            </div>
        </div>
    );
}