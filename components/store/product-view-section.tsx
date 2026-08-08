"use client"

import { useState, useMemo, useEffect } from "react"
import { ProductImages } from "./product-images"
import VariantSelector from "./variant-selector"
import { Button } from "@/components/ui/button"
import { BellRing, Mail, Phone, User, Star, ShieldCheck, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { submitStockNotification } from "@/app/actions/back-in-stock"
import { motion } from "framer-motion"
import { PromoDisplay } from "./promo-display"
import { useRecentlyViewed } from "@/hooks/use-recently-viewed"

export function ProductViewSection({ product, promos = [] }: { product: any, promos?: any[] }) {
    const defaultVariant = product.variants?.find((v: any) => v.is_default) || product.variants?.[0];

    const addToRecentlyViewed = useRecentlyViewed(s => s.addItem)
    useEffect(() => {
        if (product?.id) {
            addToRecentlyViewed({
                id: product.id,
                name: product.name,
                slug: product.slug,
                base_price: product.base_price,
                thumbnail_url: product.thumbnail_url,
                brand: product.brand,
                discount_type: product.discount_type,
                discount_value: product.discount_value,
                has_variants: product.has_variants,
                status: product.status,
                product_variants: product.variants || [],
            })
        }
    }, [product?.id])
    
    const getVariantImages = (variant: any) => {
        if (!variant) {
            const images = product.images || [];
            const productImages = images.length > 0
                ? images.map((img: any) => ({ url: img.url, alt: img.alt || 'Product image' }))
                : product.thumbnail_url
                ? [{ url: product.thumbnail_url, alt: product.name || 'Product' }]
                : [];
            return productImages;
        }

        let images: { url: string }[] = [];
        if (variant.variant_images && variant.variant_images.length > 0) {
            images = [...variant.variant_images]
                .sort((a, b) => (a.position || 0) - (b.position || 0))
                .map((img: any) => ({ url: img.url }));
        }
        if (variant.image_url) {
            const exists = images.some(img => img.url === variant.image_url);
            if (!exists) images.unshift({ url: variant.image_url });
        }
        return images.length === 0
            ? product.images || (product.thumbnail_url ? [{ url: product.thumbnail_url }] : [])
            : images;
    };

    const [selectedVariant, setSelectedVariant] = useState(defaultVariant);
    const isOutOfStock = useMemo(() => (selectedVariant?.stock || 0) <= 0, [selectedVariant]);
    const displayImages = useMemo(() => getVariantImages(selectedVariant), [selectedVariant, product]);

    const handleVariantChange = (variant: any) => setSelectedVariant(variant);

    const handleNotifyMe = async (e: React.FormEvent) => {
        e.preventDefault();
        const formElement = e.target as HTMLFormElement;
        const formData = new FormData(formElement);
        const payload = {
            userName: formData.get("name") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            productId: product.id,
            variantId: selectedVariant.id,
        };
        const res = await submitStockNotification(payload);
        if (res.success) {
            toast.success("Notification set! We'll alert you once it's restocked.");
            formElement.reset();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-7xl mx-auto px-2 py-0 md:py-16 bg-white">
            {/* LEFT: MINIMAL GALLERY */}
            <div className="w-full relative">
                <ProductImages
                    key={selectedVariant?.id || 'gallery'}
                    images={displayImages}
                />
            </div>

            {/* RIGHT: CLEAN CONTENT */}
            <div className="flex flex-col pt-0 lg:sticky lg:top-10">
                <header className="mb-0">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#fc2779]">
                            {product.brand || "Exclusive"}
                        </span>
                        <div className="w-[1px] h-3 bg-slate-200" />
                        {/* <div className="flex items-center gap-1 text-slate-400 text-[9px] font-bold">
                            4.5 <Star className="w-2.5 h-2.5 fill-slate-200 text-transparent" />
                        </div> */}
                    </div>

                    <h1 className="text-2xl md:text-5xl font-light tracking-tighter text-slate-900 leading-tight">
                        {product.name}
                    </h1>

                    {selectedVariant && (
                        <p className="mt-3 text-slate-400 text-[11px] font-medium uppercase tracking-[0.2em]">
                            {selectedVariant.name || selectedVariant.title || "Standard Selection"}
                        </p>
                    )}
                </header>

                <div className="mb-2 border-t border-slate-50 pt-8">
                    <VariantSelector
                        product={product}
                        variants={product.variants}
                        onVariantChange={handleVariantChange}
                    />
                </div>

                {/* NOTIFY ME (MINIMALIST CARD) */}
                {isOutOfStock && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-slate-50 rounded-[2rem] p-8 space-y-8 my-4"
                    >
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-2">
                                <BellRing className="w-3.5 h-3.5 text-[#fc2779]" />
                                Restock Registry
                            </h3>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                This item is currently unavailable. Register below for an immediate digital alert upon restock.
                            </p>
                        </div>

                        <form onSubmit={handleNotifyMe} className="space-y-4">
                            <div className="space-y-4">
                                <input required name="name" type="text" placeholder="FULL NAME" className="w-full bg-transparent border-b border-slate-200 py-3 text-[10px] font-bold tracking-widest focus:border-[#fc2779] outline-none transition-all placeholder:text-slate-300 uppercase" />
                                <input required name="email" type="email" placeholder="EMAIL ADDRESS" className="w-full bg-transparent border-b border-slate-200 py-3 text-[10px] font-bold tracking-widest focus:border-[#fc2779] outline-none transition-all placeholder:text-slate-300 uppercase" />
                                <input required name="phone" type="tel" placeholder="PHONE NUMBER" className="w-full bg-transparent border-b border-slate-200 py-3 text-[10px] font-bold tracking-widest focus:border-[#fc2779] outline-none transition-all placeholder:text-slate-300 uppercase" />
                            </div>

                            <Button type="submit" className="w-full h-14 rounded-full bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.3em] hover:bg-[#fc2779] transition-all duration-500">
                                Join Waitlist
                            </Button>
                        </form>
                    </motion.div>
                )}

                <PromoDisplay promos={promos} />

                {/* THE NARRATION */}
                <div className="space-y-8 pt-0 border-t border-slate-50 mt-5">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">
                            Description
                        </p>
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3" /> Certified Authentic
                        </div>
                    </div>

                    <div
                        className="prose prose-slate prose-sm max-w-none 
                        prose-p:text-slate-500 prose-p:leading-[1.8] prose-p:font-light
                        prose-strong:text-slate-900 prose-strong:font-bold prose-strong:tracking-tight
                        prose-ul:list-none prose-li:text-slate-500 prose-li:pl-0"
                        dangerouslySetInnerHTML={{ __html: product.description || "" }}
                    />
                </div>
            </div>
        </div>
    )
}