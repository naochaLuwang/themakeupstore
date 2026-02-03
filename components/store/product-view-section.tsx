// "use client"

// import { useState } from "react"
// import { ProductImages } from "./product-images"
// import { VariantSelector } from "./variant-selector"

// export function ProductViewSection({ product }: { product: any }) {
//     const defaultVariant = product.variants.find((v: any) => v.is_default) || product.variants[0];

//     const getVariantImages = (variant: any) => {
//         if (variant?.variant_image_urls && variant.variant_image_urls.length > 0) {
//             return variant.variant_image_urls.map((url: string) => ({ url }));
//         }
//         return product.images;
//     };

//     const [displayImages, setDisplayImages] = useState(getVariantImages(defaultVariant));
//     const [mainImage, setMainImage] = useState(defaultVariant?.image_url || product.thumbnail_url);
//     const [selectedVariant, setSelectedVariant] = useState(defaultVariant);

//     const handleVariantChange = (variant: any) => {
//         setSelectedVariant(variant);

//         // Update gallery images (if variant has unique set)
//         const newGallery = getVariantImages(variant);
//         setDisplayImages(newGallery);

//         // CRITICAL: Update the specific hero image for this variant
//         // Priority: variant_image_urls[0] > image_url > fallback
//         const newHero = variant.image_url || variant.variant_image_urls?.[0] || product.thumbnail_url;
//         setMainImage(newHero);
//     };

//     return (
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start max-w-7xl mx-auto px-4 py-12">
//             {/* Left: Image Gallery */}
//             <div className="w-full">
//                 <ProductImages
//                     images={displayImages}
//                     thumbnail={product.thumbnail_url}
//                     activeImageFromVariant={mainImage}
//                 />
//             </div>

//             {/* Right: Product Info */}
//             <div className="flex flex-col pt-2 lg:sticky lg:top-10">
//                 <header className="mb-10">
//                     <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">
//                         {product.brand}
//                     </p>
//                     <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900 leading-tight">
//                         {product.name}
//                     </h1>
//                 </header>

//                 <div className="mb-6 border-t border-slate-100 pt-10">
//                     <VariantSelector
//                         product={product}
//                         variants={product.variants}
//                         onVariantChange={handleVariantChange}
//                     />
//                 </div>

//                 <div className="space-y-4 pt-8 border-t border-slate-100">
//                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
//                         Description
//                     </p>
//                     <div className="text-slate-500 leading-relaxed text-sm max-w-prose font-light">
//                         {product.description}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }
"use client"

import { useState, useMemo } from "react"
import { ProductImages } from "./product-images"
import { VariantSelector } from "./variant-selector"

export function ProductViewSection({ product }: { product: any }) {
    // Identify the starting variant
    const defaultVariant = product.variants?.find((v: any) => v.is_default) || product.variants?.[0];

    // Helper to extract the 2-3 images from the 'variant_images' table join
    const getVariantImages = (variant: any) => {
        if (!variant) return [];

        let images: { url: string }[] = [];

        // 1. Get multiple images from the 'variant_images' table (Relational Join)
        if (variant.variant_images && variant.variant_images.length > 0) {
            // Sort by position if available
            images = [...variant.variant_images]
                .sort((a, b) => (a.position || 0) - (b.position || 0))
                .map((img: any) => ({ url: img.url }));
        }

        // 2. Add the main variant 'image_url' if it's not already in the list
        if (variant.image_url) {
            const exists = images.some(img => img.url === variant.image_url);
            if (!exists) {
                images.unshift({ url: variant.image_url });
            }
        }

        // 3. Fallback to product thumbnails if no variant-specific images exist
        if (images.length === 0) {
            return product.images || (product.thumbnail_url ? [{ url: product.thumbnail_url }] : []);
        }

        return images;
    };

    const [selectedVariant, setSelectedVariant] = useState(defaultVariant);

    // Memoize images so we don't recalculate on every minor re-render
    const displayImages = useMemo(() => getVariantImages(selectedVariant), [selectedVariant, product]);

    const handleVariantChange = (variant: any) => {
        setSelectedVariant(variant);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start max-w-7xl mx-auto px-4 py-12">
            <div className="w-full">
                {/* The key forces a complete refresh of the gallery when shade changes */}
                <ProductImages
                    key={selectedVariant?.id || 'gallery'}
                    images={displayImages}
                />
            </div>

            <div className="flex flex-col pt-2 lg:sticky lg:top-10">
                <header className="mb-10">
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">
                        {product.brand}
                    </p>
                    <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900 leading-tight">
                        {product.name}
                    </h1>
                </header>

                <div className="mb-6 border-t border-slate-100 pt-3">
                    <VariantSelector
                        product={product}
                        variants={product.variants}
                        onVariantChange={handleVariantChange}
                    />
                </div>

                <div className="space-y-4 pt-8 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                        Description
                    </p>
                    <div className="text-slate-500 leading-relaxed text-sm max-w-prose font-light italic">
                        {product.description}
                    </div>
                </div>
            </div>
        </div>
    )
}