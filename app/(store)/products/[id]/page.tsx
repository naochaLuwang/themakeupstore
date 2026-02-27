import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ProductViewSection } from "@/components/store/product-view-section"
import { ProductCard } from "@/components/store/product-card"
import { ReviewsSection } from "@/components/store/reviews-section"
import { Breadcrumbs } from "@/components/store/breadcrumbs"

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch User Session
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Fetch main product with category names for breadcrumbs
    const { data: product } = await supabase
        .from("products")
        .select(`
            *,
            images:product_images(url, alt),
            variants:product_variants(
      *,
      variant_images(url, position) 
    ),
            reviews:product_reviews(*),
            product_categories(
                categories(id, name, slug)
            )
        `)
        .eq("id", id)
        .eq("product_reviews.is_approved", true)
        .order('created_at', { foreignTable: 'product_reviews', ascending: false })
        .single()

    if (!product) notFound()



    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            {/* Breadcrumb Section
            <Breadcrumbs parent={breadcrumbParent} current={product.name} /> */}

            {/* Main Product Section */}
            <ProductViewSection product={product} />

            {/* Related Products Section */}
            {/* {relatedProducts.length > 0 && (
                <section className="mt-24 border-t border-slate-100 pt-24">
                    <div className="flex flex-col mb-10">
                        <span className="font-daciana text-primary tracking-[0.4em] uppercase text-[10px] mb-2">
                            Curated for you
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 uppercase">
                            Related Collections
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        {relatedProducts.map((relProduct) => (
                            <ProductCard key={relProduct.id} product={relProduct} />
                        ))}
                    </div>
                </section>
            )} */}

            {/* Reviews Section */}
            <div className="mt-2">
                <ReviewsSection
                    reviews={product.reviews || []}
                    productId={product.id}
                    user={user}
                />
            </div>
        </div>
    )
}