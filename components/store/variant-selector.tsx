"use client"

import { useState } from "react"
import { Minus, Plus, ShoppingBag, Tag } from "lucide-react"
import { toast } from "sonner"
import { useCart, CartItem } from "@/components/store/use-cart"
import { calculateDiscountedPrice } from "@/lib/price-helper"

export function VariantSelector({ product, variants, onVariantChange }: any) {
    const addItem = useCart((state) => state.addItem)

    // Default to the designated default variant or the first one available
    const [selectedVariant, setSelectedVariant] = useState(
        variants.find((v: any) => v.is_default) || variants[0]
    )
    const [quantity, setQuantity] = useState(1)

    // Calculate Prices
    const salePrice = calculateDiscountedPrice(
        Number(selectedVariant.price),
        selectedVariant.discount_type,
        Number(selectedVariant.discount_value)
    )

    const originalPrice = Number(selectedVariant.price)
    const savingsAmount = originalPrice - salePrice
    const savingsPercent = selectedVariant.discount_type === 'percentage'
        ? selectedVariant.discount_value
        : Math.round((savingsAmount / originalPrice) * 100)

    const handleVariantClick = (v: any) => {
        setSelectedVariant(v)
        setQuantity(1)
        if (onVariantChange) onVariantChange(v)
    }

    const handleAddToCart = () => {
        if (!selectedVariant) return;

        const item: CartItem = {
            // UNIQUE ID: Combined to allow multiple variants of same product in cart
            id: `${product.id}-${selectedVariant.id}`,
            productId: product.id,
            categoryId: product.category_id,
            variantId: selectedVariant.id,
            name: product.name,
            variantTitle: selectedVariant.title,
            price: salePrice,
            mrp: originalPrice,
            // FALLBACK: Prevents the "empty string src" error
            image: selectedVariant.image_url || product.thumbnail_url || "/placeholder.png",
            quantity: quantity,
            stock: selectedVariant.stock
        };

        addItem(item);
        // toast.success(`Added ${quantity} ${product.name} to bag`);
    };

    return (
        <div className="space-y-10">
            {/* PRICE SECTION */}
            <div className="space-y-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-4">
                        <span className="text-4xl font-semibold tracking-tighter text-slate-900">
                            ₹{Math.round(salePrice).toLocaleString('en-IN')}
                        </span>
                        {savingsAmount > 0 && (
                            <span className="text-xl text-slate-300 line-through decoration-slate-200 font-light">
                                ₹{Math.round(originalPrice).toLocaleString('en-IN')}
                            </span>
                        )}
                    </div>
                    {savingsAmount > 0 && (
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">
                            Save ₹{Math.round(savingsAmount).toLocaleString('en-IN')} ({savingsPercent}%)
                        </span>
                    )}
                </div>
            </div>

            {/* VARIANT SELECTION */}
            {product.has_variants && (
                <div className="space-y-5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <Tag className="w-3 h-3" />
                        {variants[0]?.hex_code ? "Select Shade" : "Select Size"}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {variants.map((v: any) => {
                            const isSelected = selectedVariant.id === v.id;
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => handleVariantClick(v)}
                                    className={`group flex items-center gap-3 p-3 rounded-md border transition-all duration-200 ${isSelected ? "border-slate-900 bg-slate-50 ring-[0.5px] ring-slate-900" : "border-slate-100 bg-white"
                                        }`}
                                >
                                    {v.hex_code ? (
                                        <div className="w-6 h-6 rounded-full border border-black/5" style={{ backgroundColor: v.hex_code }} />
                                    ) : (
                                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                            {v.title.substring(0, 1)}
                                        </div>
                                    )}
                                    <span className={`text-[10px] uppercase tracking-wider font-bold truncate ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                                        {v.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* QUANTITY & ACTION */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-y border-slate-50 py-5">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Quantity</label>
                        <span className="text-[9px] text-slate-300 uppercase tracking-widest">{selectedVariant.stock} available</span>
                    </div>
                    <div className="flex items-center bg-slate-50 p-1 rounded-full border border-slate-100">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white disabled:opacity-20">
                            <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold tabular-nums">{quantity}</span>
                        <button onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white disabled:opacity-20">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <button
                    disabled={selectedVariant.stock <= 0}
                    onClick={handleAddToCart}
                    className="w-full h-14 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-black active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-400 flex items-center justify-center gap-3 transition-all"
                >
                    <ShoppingBag className="w-4 h-4" />
                    {selectedVariant.stock <= 0 ? "Out of Stock" : "Add to Bag"}
                </button>
            </div>
        </div>
    )
}