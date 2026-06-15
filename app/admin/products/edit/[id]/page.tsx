import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import ProductEditForm from "@/components/admin/product-edit-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: product, error } = await supabase
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
        .single();

    const { data: categories } = await supabase.from("categories").select("id, name");

    if (error || !product) return notFound();

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
                <ProductEditForm product={product} categories={categories || []} />
            </div>
        </div>
    );
}