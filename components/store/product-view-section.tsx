

// "use client"

// import { useState, useMemo } from "react"
// import { ProductImages } from "./product-images"
// import VariantSelector from "./variant-selector"
// import { Button } from "@/components/ui/button" // Assuming you use shadcn/ui
// import { BellRing, Mail, Phone, User } from "lucide-react"
// import { toast } from "sonner"
// import { submitStockNotification } from "@/app/actions/back-in-stock"


// export function ProductViewSection({ product }: { product: any }) {
//     const defaultVariant = product.variants?.find((v: any) => v.is_default) || product.variants?.[0];

//     const getVariantImages = (variant: any) => {
//         if (!variant) return [];
//         let images: { url: string }[] = [];

//         if (variant.variant_images && variant.variant_images.length > 0) {
//             images = [...variant.variant_images]
//                 .sort((a, b) => (a.position || 0) - (b.position || 0))
//                 .map((img: any) => ({ url: img.url }));
//         }

//         if (variant.image_url) {
//             const exists = images.some(img => img.url === variant.image_url);
//             if (!exists) images.unshift({ url: variant.image_url });
//         }

//         if (images.length === 0) {
//             return product.images || (product.thumbnail_url ? [{ url: product.thumbnail_url }] : []);
//         }
//         return images;
//     };

//     const [selectedVariant, setSelectedVariant] = useState(defaultVariant);

//     // Check if current selection is out of stock
//     const isOutOfStock = useMemo(() => (selectedVariant?.stock || 0) <= 0, [selectedVariant]);

//     const displayImages = useMemo(() => getVariantImages(selectedVariant), [selectedVariant, product]);

//     const handleVariantChange = (variant: any) => {
//         setSelectedVariant(variant);
//     };

//     // Placeholder for Notify Me Logic
//     const handleNotifyMe = async (e: React.FormEvent) => {
//         e.preventDefault();
//         const formElement = e.target as HTMLFormElement;
//         const formData = new FormData(formElement);

//         const payload = {
//             userName: formData.get("name") as string,
//             email: formData.get("email") as string,
//             phone: formData.get("phone") as string,
//             productId: product.id,
//             variantId: selectedVariant.id, // This captures the specific shade ID
//         };

//         const res = await submitStockNotification(payload);

//         if (res.success) {
//             toast.success("Notification set! We'll alert you once it's restocked.");
//             formElement.reset();
//         } else {
//             toast.error(res.error);
//         }
//     };

//     return (
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start max-w-7xl mx-auto px-4 py-12">
//             <div className="w-full">
//                 <ProductImages
//                     key={selectedVariant?.id || 'gallery'}
//                     images={displayImages}
//                 />
//             </div>

//             <div className="flex flex-col pt-2 lg:sticky lg:top-10">
//                 <header className="mb-10">
//                     <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">
//                         {product.brand}
//                     </p>
//                     <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900 leading-tight">
//                         {product.name} {selectedVariant && (
//                             <span className="text-slate-600 text-xl font-light block md:inline">
//                                 <span className="inline mr-1 "> — </span>
//                                 {selectedVariant.name || selectedVariant.title || "Standard"}
//                             </span>
//                         )}
//                     </h1>
//                     {/* Stock Status Badge */}
//                     {/* <div className="mt-4">
//                         {isOutOfStock ? (
//                             <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
//                                 Out of Stock
//                             </span>
//                         ) : (
//                             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
//                                 In Stock
//                             </span>
//                         )}
//                     </div> */}
//                 </header>

//                 <div className="mb-6 border-t border-slate-100 pt-3">
//                     <VariantSelector
//                         product={product}
//                         variants={product.variants}
//                         onVariantChange={handleVariantChange}
//                     />
//                 </div>

//                 {/* NOTIFY ME SECTION */}
//                 {/* Only show the Notify Me section if the variant is out of stock.
//     If it is IN stock, we show nothing here because the 'Add to Bag' 
//     button lives inside the VariantSelector component.
// */}
//                 {isOutOfStock && (
//                     <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 my-6">
//                         <div className="space-y-1">
//                             <div className="flex items-center gap-2 text-slate-900">
//                                 <BellRing className="w-4 h-4" />
//                                 <h3 className="text-sm font-black uppercase tracking-widest">Waitlist Me</h3>
//                             </div>
//                             <p className="text-xs text-slate-500 font-light leading-relaxed">
//                                 This shade is popular. Leave your details and we'll transmit a message the moment it returns to stock.
//                             </p>
//                         </div>

//                         <form onSubmit={handleNotifyMe} className="space-y-3">
//                             {/* Full Name */}
//                             <div className="relative group">
//                                 <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
//                                 <input required name="name" type="text" placeholder="Your Name" className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-11 pr-4 text-xs focus:ring-1 focus:ring-slate-900 outline-none transition-all" />
//                             </div>

//                             {/* Email */}
//                             <div className="relative group">
//                                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
//                                 <input required name="email" type="email" placeholder="Email Address" className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-11 pr-4 text-xs focus:ring-1 focus:ring-slate-900 outline-none transition-all" />
//                             </div>

//                             {/* Phone */}
//                             <div className="relative group">
//                                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
//                                 <input required name="phone" type="tel" placeholder="Mobile Number" className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-11 pr-4 text-xs focus:ring-1 focus:ring-slate-900 outline-none transition-all" />
//                             </div>

//                             <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl">
//                                 Notify Me
//                             </Button>
//                         </form>
//                     </div>
//                 )}

//                 <div className="space-y-6 pt-10 border-t border-slate-100 mt-6">
//                     <div className="flex items-center gap-3">
//                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
//                             The Narration
//                         </p>
//                         <div className="h-px flex-1 bg-slate-100" />
//                     </div>
//                     <div
//                         className="prose prose-slate prose-sm max-w-none prose-p:text-slate-500 prose-p:leading-relaxed prose-p:font-light prose-strong:text-slate-900 prose-strong:font-bold prose-ul:list-disc prose-li:text-slate-500 prose-img:rounded-3xl prose-img:border prose-img:border-slate-100"
//                         dangerouslySetInnerHTML={{ __html: product.description || "" }}
//                     />
//                 </div>
//             </div>
//         </div>
//     )
// }

"use client"

import { useState, useMemo } from "react"
import { ProductImages } from "./product-images"
import VariantSelector from "./variant-selector"
import { Button } from "@/components/ui/button"
import { BellRing, Mail, Phone, User, Star, ShieldCheck, Sparkles, ScanLine, Palette } from "lucide-react"
import { toast } from "sonner"
import { submitStockNotification } from "@/app/actions/back-in-stock"
import { motion } from "framer-motion"
import { PromoDisplay } from "./promo-display"
import VirtualTryOn from "./virtual-try-on"
import FoundationShadeFinder from "./foundation-shade-finder"

export function ProductViewSection({ product, promos = [], enableTryOn = false, enableShadeFinder = false }: { product: any, promos?: any[], enableTryOn?: boolean, enableShadeFinder?: boolean }) {
    const defaultVariant = product.variants?.find((v: any) => v.is_default) || product.variants?.[0];
    
    console.log('ProductViewSection - Product data:', {
        hasVariants: !!product.variants,
        variantsCount: product.variants?.length || 0,
        hasImages: !!product.images,
        imagesCount: product.images?.length || 0,
        images: product.images,
        thumbnail: product.thumbnail_url,
        defaultVariant: !!defaultVariant
    });

    const getVariantImages = (variant: any) => {
        // If no variant (product without variants), use product-level images directly
        if (!variant) {
            console.log('No variant selected, using product images');
            const images = product.images || [];
            const productImages = images.length > 0
                ? images.map((img: any) => ({ url: img.url, alt: img.alt || 'Product image' }))
                : product.thumbnail_url
                ? [{ url: product.thumbnail_url, alt: product.name || 'Product' }]
                : [];
            console.log('Product images to display:', productImages);
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

    const [tryOnOpen, setTryOnOpen] = useState(false);
    const [shadeFinderOpen, setShadeFinderOpen] = useState(false);
    const hasHexCode = selectedVariant?.hex_code && selectedVariant.hex_code !== '#cbd5e1';

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

                {/* VIRTUAL TRY-ON BUTTON — overlaid on product image */}
                {enableTryOn && hasHexCode && selectedVariant && (
                    <button
                        onClick={() => setTryOnOpen(true)}
                        className="absolute top-4 right-4 z-10 w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-lg border border-white/30 text-[10px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 shadow-lg hover:bg-black/60 hover:scale-105 active:scale-95 transition-all group"
                    >
                        <ScanLine className="w-5 h-5 text-white" />
                        <span className="text-[7px] text-white/90">Try On</span>
                    </button>
                )}

                {/* SHADE FINDER BUTTON — overlaid on product image */}
                {enableShadeFinder && (
                    <button
                        onClick={() => setShadeFinderOpen(true)}
                        className="absolute top-4 right-4 z-10 w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-lg border border-white/30 text-[10px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 shadow-lg hover:bg-black/60 hover:scale-105 active:scale-95 transition-all group"
                        style={{ right: enableTryOn ? 'calc(4rem + 8px)' : '1rem' }}
                    >
                        <Palette className="w-5 h-5 text-white" />
                        <span className="text-[7px] text-white/90">Match</span>
                    </button>
                )}

                <FoundationShadeFinder
                    open={shadeFinderOpen}
                    onClose={() => setShadeFinderOpen(false)}
                    variants={(product.variants || []).filter((v: any) => v.hex_code && v.hex_code !== '#cbd5e1').map((v: any) => ({ id: v.id, title: v.title, hex_code: v.hex_code }))}
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

                <VirtualTryOn
                    open={tryOnOpen}
                    onClose={() => setTryOnOpen(false)}
                    variants={(product.variants || []).filter((v: any) => v.hex_code && v.hex_code !== '#cbd5e1').map((v: any) => ({ id: v.id, title: v.title, hex_code: v.hex_code }))}
                    initialHexCode={selectedVariant?.hex_code || "#fc2779"}
                />

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