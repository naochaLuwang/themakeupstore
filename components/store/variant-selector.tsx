"use client"

import { useState, useMemo, useEffect } from "react"
import { Minus, Plus, ShoppingBag, MapPin, AlertCircle, Loader2, Truck, Sparkles, Search, Palette } from "lucide-react"
import { toast } from "sonner"
import { useCart, CartItem } from "@/components/store/use-cart"
import { calculateDiscountedPrice } from "@/lib/price-helper"
import { createClient } from "@/utils/supabase/client"
import { motion, AnimatePresence } from "framer-motion"

export default function VariantSelector({ product, variants = [], onVariantChange }: any) {
    const addItem = useCart((state) => state.addItem)
    const supabase = createClient()

    const hasVariants = product.has_variants && variants && variants.length > 0;

    const [selectedVariant, setSelectedVariant] = useState(() => {
        if (hasVariants) {
            return variants.find((v: any) => v.is_default) || variants[0];
        }
        return variants[0] || product;
    })

    const [quantity, setQuantity] = useState(1)
    const [variantSearch, setVariantSearch] = useState("")
    const [checkPincode, setCheckPincode] = useState("")
    const [pincodeStatus, setPincodeStatus] = useState<{
        loading: boolean;
        checked: boolean;
        available: boolean;
        methods: any[];
    } | null>(null);

    const currentStock = Number(selectedVariant?.stock ?? 0);

    useEffect(() => {
        const saved = localStorage.getItem('user_pincode')
        if (saved) setCheckPincode(saved)
    }, [])

    const filteredVariants = useMemo(() => {
        if (!hasVariants) return [];
        return variants.filter((v: any) =>
            v.title.toLowerCase().includes(variantSearch.toLowerCase())
        )
    }, [variants, variantSearch, hasVariants])

    const currentPrice = Number(selectedVariant?.price ?? product?.base_price ?? 0)
    const currentMrp = Number(selectedVariant?.mrp ?? product?.mrp ?? currentPrice)

    const salePrice = calculateDiscountedPrice(
        currentPrice,
        selectedVariant?.discount_type ?? product?.discount_type ?? 'none',
        Number(selectedVariant?.discount_value ?? product?.discount_value ?? 0)
    )

    const savingsAmount = currentMrp - salePrice
    const savingsPercent = Math.round((savingsAmount / currentMrp) * 100)

    const handleVariantClick = (v: any) => {
        setSelectedVariant(v);
        setQuantity(1);
        if (onVariantChange) onVariantChange(v);
        if (window.navigator.vibrate) window.navigator.vibrate(8);
    };

    const handleAddToCart = () => {
        if (currentStock <= 0) return;

        const item: CartItem = {
            id: hasVariants ? `${product.id}-${selectedVariant.id}` : product.id,
            productId: product.id,
            categoryId: product.category_id,
            variantId: hasVariants ? selectedVariant.id : (variants[0]?.id || product.id),
            name: product.name,
            variantTitle: hasVariants ? selectedVariant.title : "Standard",
            price: salePrice,
            mrp: currentMrp,
            originalPrice: currentMrp,
            image: hasVariants ? (selectedVariant.image_url || product.thumbnail_url) : product.thumbnail_url,
            quantity: quantity,
            stock: currentStock
        };
        const result = addItem(item);
        if (result?.capped) {
            toast.info(`Only ${result.maxQty} in stock — quantity capped`);
        } else {
            toast.success(`Added to Bag`, {
                style: { background: '#fc2779', color: '#fff', border: 'none', fontWeight: 'bold', borderRadius: '12px' }
            });
        }
    };

    const checkAvailability = async () => {
        if (checkPincode.length !== 6) return toast.error("Enter a valid 6-digit pincode");
        setPincodeStatus({ loading: true, checked: false, available: false, methods: [] });
        try {
            const { data: zones, error } = await supabase.from("shipping_zones").select("*, shipping_methods(*)").eq("pincode", checkPincode);
            if (error) throw error;
            if (zones && zones.length > 0) {
                const allMethods = zones.flatMap(z => z.shipping_methods);
                setPincodeStatus({ loading: false, checked: true, available: true, methods: allMethods });
                localStorage.setItem('user_pincode', checkPincode);
            } else {
                setPincodeStatus({ loading: false, checked: true, available: false, methods: [] });
            }
        } catch (err) {
            toast.error("Lookup failed");
            setPincodeStatus(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 px-1">
                <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black tracking-tighter text-slate-950">
                        ₹{Math.round(salePrice).toLocaleString('en-IN')}
                    </span>
                    {savingsAmount > 0 && (
                        <>
                            <span className="text-lg text-slate-300 line-through font-medium">
                                ₹{Math.round(currentMrp).toLocaleString('en-IN')}
                            </span>
                            <span className="text-sm font-black text-[#fc2779] animate-pulse">
                                {savingsPercent}% OFF
                            </span>
                        </>
                    )}
                </div>
                {savingsAmount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full w-fit border border-emerald-100/50">
                        <Sparkles className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">
                            Price Dropped by ₹{Math.round(savingsAmount).toLocaleString()}
                        </span>
                    </div>
                )}
            </div>

            {hasVariants && (
                <div className="bg-white rounded-[2.5rem] border border-pink-50 shadow-sm overflow-hidden">
                    <div className="bg-slate-50/50 p-6 flex justify-between items-center border-b border-pink-50">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fc2779]">
                                Active Choice
                            </label>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">
                                {selectedVariant.title}
                            </h3>
                        </div>

                        <motion.div
                            key={selectedVariant.id}
                            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 rounded-2xl border-4 border-white shadow-xl shadow-pink-100 flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: selectedVariant.hex_code || '#F1F5F9' }}
                        >
                            {!selectedVariant.hex_code && <Palette className="w-6 h-6 text-slate-200" />}
                        </motion.div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#fc2779] transition-colors" />
                            <input
                                type="text"
                                placeholder="SEARCH SHADES..."
                                value={variantSearch}
                                onChange={(e) => setVariantSearch(e.target.value)}
                                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-[10px] font-black tracking-widest outline-none focus:ring-2 focus:ring-[#fc2779]/10 transition-all uppercase placeholder:text-slate-200"
                            />
                        </div>

                        <div className="max-h-[280px] overflow-y-auto no-scrollbar pr-1">
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-y-6 gap-x-2">
                                <AnimatePresence mode="popLayout">
                                    {filteredVariants.map((v: any) => {
                                        const isSelected = selectedVariant.id === v.id;
                                        const isOutOfStock = v.stock <= 0;
                                        return (
                                            <motion.button
                                                layout
                                                key={v.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                onClick={() => handleVariantClick(v)}
                                                className="flex flex-col items-center gap-2 outline-none group"
                                            >
                                                <div className={`relative w-12 h-12 rounded-xl transition-all duration-300 p-1 
                                                    ${isSelected ? 'bg-[#fc2779] scale-110 shadow-lg shadow-pink-200' : 'bg-slate-50 hover:bg-pink-50'}
                                                    ${isOutOfStock ? 'opacity-30' : ''}
                                                `}>
                                                    <div className="w-full h-full rounded-xl border-2 border-white shadow-inner" style={{ backgroundColor: v.hex_code }}>
                                                        {isOutOfStock && <div className="absolute inset-0 flex items-center justify-center rotate-45"><div className="w-full h-[1px] bg-slate-500" /></div>}
                                                    </div>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase tracking-tighter truncate w-full px-1 text-center transition-colors ${isSelected ? 'text-[#fc2779]' : 'text-slate-400'}`}>
                                                    {v.title}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100/50 rounded-2xl p-1 h-14 border border-slate-100">
                        <button
                            disabled={quantity <= 1 || currentStock <= 0}
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm disabled:opacity-30 active:scale-95 transition-all"
                        >
                            <Minus className="w-4 h-4 text-slate-600" />
                        </button>
                        <span className="w-10 text-center text-sm font-black tabular-nums">{quantity}</span>
                        <button
                            disabled={quantity >= currentStock || currentStock <= 0}
                            onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm disabled:opacity-30 active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>

                    <button
                        disabled={currentStock <= 0}
                        onClick={handleAddToCart}
                        className={`flex-1 h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl
                            ${currentStock <= 0
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                : "bg-[#fc2779] text-white shadow-pink-200/50 hover:bg-pink-600 active:scale-[0.98]"}`}
                    >
                        <ShoppingBag className="w-4 h-4" />
                        {currentStock <= 0 ? "Waitlist Only" : "Add to Bag"}
                    </button>
                </div>
            </div>

            <div className="pt-4">
                <div className="bg-white rounded-[2rem] border border-slate-100 p-8 space-y-8 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-[#fc2779]" />
                            </div>
                            <div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-950">Delivery Check</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Check logistics for your area</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 relative group">
                            <input
                                type="text"
                                placeholder="ENTER PINCODE"
                                value={checkPincode}
                                onChange={(e) => setCheckPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-5 text-[12px] font-black tracking-widest outline-none focus:ring-2 focus:ring-pink-100 transition-all uppercase placeholder:text-slate-300"
                            />
                        </div>
                        <button
                            onClick={checkAvailability}
                            disabled={pincodeStatus?.loading || checkPincode.length < 6}
                            className="px-8 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all disabled:opacity-50"
                        >
                            {pincodeStatus?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                        </button>
                    </div>

                    <AnimatePresence>
                        {pincodeStatus?.checked && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                {!pincodeStatus.available ? (
                                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase">Serviceable region not detected</span>
                                    </div>
                                ) : (
                                    <div className="grid gap-3 pt-2">
                                        {pincodeStatus.methods.map((m: any) => (
                                            <div key={m.id} className="flex justify-between items-center p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#fc2779]">
                                                        <Truck className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{m.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{m.delivery_time_label}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[12px] font-black text-[#fc2779]">₹{m.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
