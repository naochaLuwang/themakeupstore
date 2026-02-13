
"use client"

import { useState, useMemo } from "react"
import { ProductImages } from "./product-images"
import  VariantSelector  from "./variant-selector"

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
                        {product.name} {selectedVariant && (
                            <span className="text-slate-600 text-xl font-light block md:inline">
                                <span className="inline mr-1 "> — </span>
                                {/* Checks common DB field names: name, title, shade, color_name, or color */}
                                {selectedVariant.name ||
                                    selectedVariant.title ||
                                    selectedVariant.shade ||
                                    selectedVariant.color_name ||
                                    selectedVariant.color ||
                                    "Selected"}
                            </span>
                        )}
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