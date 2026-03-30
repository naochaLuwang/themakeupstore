import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ProductViewSection } from "@/components/store/product-view-section"
import { getPromosForProduct } from "@/app/actions/promo"
import { ProductCard } from "@/components/store/product-card"
import { ReviewsSection } from "@/components/store/reviews-section"
import { Breadcrumbs } from "@/components/store/breadcrumbs"
import type { Metadata, ResolvingMetadata } from "next"

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> },
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { id } = await params
    const supabase = await createClient()
    const { data: product } = await supabase.from("products").select("name, description, thumbnail_url, brand").eq("id", id).single()

    if (!product) return {}

    const previousImages = (await parent).openGraph?.images || []

    return {
        title: product.name,
        description: product.description || `Buy ${product.name} by ${product.brand} at The Makeup Store Wangkhei.`,
        openGraph: {
            title: product.name,
            description: product.description,
            images: [product.thumbnail_url, ...previousImages],
        },
        twitter: {
            card: "summary_large_image",
            title: product.name,
            description: product.description,
            images: [product.thumbnail_url],
        },
    }
}

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
                categories(id, name, slug, parent:parent_id(id, name, slug))
            )
        `)
        .eq("id", id)
        .eq("product_reviews.is_approved", true)
        .order('created_at', { foreignTable: 'product_reviews', ascending: false })
        .single()

    if (!product) notFound()
    
    // 3. Fetch Promos for this product
    const categoryIds = product.product_categories?.map((pc: any) => pc.categories.id) || []
    const promos = await getPromosForProduct(product.id, categoryIds)



    // 4. Build Breadcrumbs
    const firstCat = product.product_categories?.[0]?.categories
    const breadcrumbItems = []
    if (firstCat) {
        if (firstCat.parent) {
            const parentSlug = firstCat.parent.slug;
            const pathSegment = (parentSlug === 'exclusive' || parentSlug === 'essentials') ? parentSlug : `categories/${parentSlug}`;
            breadcrumbItems.push({ label: firstCat.parent.name, href: `/${pathSegment}` })
        }
        const catSlug = firstCat.slug;
        const pathSegment = (catSlug === 'exclusive' || catSlug === 'essentials' || (firstCat.parent && (firstCat.parent.slug === 'exclusive' || firstCat.parent.slug === 'essentials'))) 
            ? (firstCat.parent?.slug || catSlug) + '/' + catSlug 
            : `categories/${catSlug}`;
        
        breadcrumbItems.push({ label: firstCat.name, href: `/${pathSegment}` })
    }
    breadcrumbItems.push({ label: product.name, href: `/products/${product.id}` })

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
            <Breadcrumbs items={breadcrumbItems} />

            {/* Main Product Section */}
            <ProductViewSection product={product} promos={promos} />

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