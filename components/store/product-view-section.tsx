"use client"

import { useState } from "react"
import { ProductImages } from "./product-images"
import { VariantSelector } from "./variant-selector"

export function ProductViewSection({ product }: { product: any }) {
    const defaultVariant = product.variants.find((v: any) => v.is_default) || product.variants[0];

    const getVariantImages = (variant: any) => {
        if (variant?.variant_image_urls && variant.variant_image_urls.length > 0) {
            return variant.variant_image_urls.map((url: string) => ({ url }));
        }
        return product.images;
    };

    const [displayImages, setDisplayImages] = useState(getVariantImages(defaultVariant));
    const [mainImage, setMainImage] = useState(defaultVariant?.image_url || product.thumbnail_url);
    const [selectedVariant, setSelectedVariant] = useState(defaultVariant);

    const handleVariantChange = (variant: any) => {
        setSelectedVariant(variant);

        // Update gallery images (if variant has unique set)
        const newGallery = getVariantImages(variant);
        setDisplayImages(newGallery);

        // CRITICAL: Update the specific hero image for this variant
        // Priority: variant_image_urls[0] > image_url > fallback
        const newHero = variant.image_url || variant.variant_image_urls?.[0] || product.thumbnail_url;
        setMainImage(newHero);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start max-w-7xl mx-auto px-4 py-12">
            {/* Left: Image Gallery */}
            <div className="w-full">
                <ProductImages
                    images={displayImages}
                    thumbnail={product.thumbnail_url}
                    activeImageFromVariant={mainImage}
                />
            </div>

            {/* Right: Product Info */}
            <div className="flex flex-col pt-2 lg:sticky lg:top-10">
                <header className="mb-10">
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">
                        {product.brand}
                    </p>
                    <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900 leading-tight">
                        {product.name}
                    </h1>
                </header>

                <div className="mb-6 border-t border-slate-100 pt-10">
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
                    <div className="text-slate-500 leading-relaxed text-sm max-w-prose font-light">
                        {product.description}
                    </div>
                </div>
            </div>
        </div>
    )
}