// app/admin/products/[id]/edit/page.tsx
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import ProductEditForm from "@/components/admin/product-edit-form";

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
        <div className="container mx-auto py-10">
            <ProductEditForm product={product} categories={categories || []} />
        </div>
    );
}