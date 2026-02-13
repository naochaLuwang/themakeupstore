

// "use client"

// import { useState } from "react"
// import { Minus, Plus, ShoppingBag, Tag } from "lucide-react"
// import { toast } from "sonner"
// import { useCart, CartItem } from "@/components/store/use-cart"
// import { calculateDiscountedPrice } from "@/lib/price-helper"

// export function VariantSelector({ product, variants, onVariantChange }: any) {
//     const addItem = useCart((state) => state.addItem)

//     const [selectedVariant, setSelectedVariant] = useState(
//         variants.find((v: any) => v.is_default) || variants[0]
//     )
//     const [quantity, setQuantity] = useState(1)

//     const salePrice = calculateDiscountedPrice(
//         Number(selectedVariant.price),
//         selectedVariant.discount_type,
//         Number(selectedVariant.discount_value)
//     )

//     const originalPrice = Number(selectedVariant.price)
//     const savingsAmount = originalPrice - salePrice
//     const savingsPercent = selectedVariant.discount_type === 'percentage'
//         ? selectedVariant.discount_value
//         : Math.round((savingsAmount / originalPrice) * 100)

//     const handleVariantClick = (v: any) => {
//         setSelectedVariant(v);
//         setQuantity(1);
//         if (onVariantChange) onVariantChange(v); // This passes the whole variant object!
//     };

//     const handleAddToCart = () => {
//         if (!selectedVariant || selectedVariant.stock <= 0) return;

//         const item: CartItem = {
//             id: `${product.id}-${selectedVariant.id}`,
//             productId: product.id,
//             categoryId: product.category_id,
//             variantId: selectedVariant.id,
//             name: product.name,
//             variantTitle: selectedVariant.title,
//             price: salePrice,
//             mrp: originalPrice,
//             image: selectedVariant.image_url || product.thumbnail_url || "/placeholder.png",
//             quantity: quantity,
//             stock: selectedVariant.stock
//         };

//         addItem(item);
//         toast.success(`Added ${product.name} - ${selectedVariant.title} to bag`);
//     };

//     return (
//         <div className="space-y-10">
//             {/* PRICE SECTION */}
//             <div className="space-y-4">
//                 <div className="flex flex-col gap-1">
//                     <div className="flex items-center gap-4">
//                         <span className="text-4xl font-semibold tracking-tighter text-slate-900">
//                             ₹{Math.round(salePrice).toLocaleString('en-IN')}
//                         </span>
//                         {savingsAmount > 0 && (
//                             <span className="text-xl text-slate-300 line-through decoration-slate-200 font-light">
//                                 ₹{Math.round(originalPrice).toLocaleString('en-IN')}
//                             </span>
//                         )}
//                     </div>
//                     {savingsAmount > 0 && (
//                         <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">
//                             Save ₹{Math.round(savingsAmount).toLocaleString('en-IN')} ({savingsPercent}%)
//                         </span>
//                     )}
//                 </div>
//             </div>

//             {/* VARIANT SELECTION */}
//             {product.has_variants && (
//                 <div className="space-y-5">
//                     <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
//                         <Tag className="w-3 h-3" />
//                         {variants[0]?.hex_code ? "Select Shade" : "Select Variant"}
//                     </label>
//                     <div className="grid grid-cols-2 gap-3">
//                         {variants.map((v: any) => {
//                             const isSelected = selectedVariant.id === v.id;
//                             const isOutOfStock = v.stock <= 0;
//                             return (
//                                 <button
//                                     key={v.id}
//                                     disabled={isOutOfStock}
//                                     onClick={() => handleVariantClick(v)}
//                                     className={`group flex items-center gap-3 p-3 rounded-md border transition-all duration-200 ${isSelected
//                                         ? "border-slate-900 bg-slate-50 ring-[0.5px] ring-slate-900"
//                                         : "border-slate-100 bg-white"
//                                         } ${isOutOfStock ? "opacity-40 grayscale cursor-not-allowed" : "hover:border-slate-300"}`}
//                                 >
//                                     {v.hex_code ? (
//                                         <div className="w-6 h-6 rounded-full border border-black/5" style={{ backgroundColor: v.hex_code }} />
//                                     ) : (
//                                         <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase">
//                                             {v.title.substring(0, 2)}
//                                         </div>
//                                     )}
//                                     <span className={`text-[10px] uppercase tracking-wider font-bold truncate ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
//                                         {v.title}
//                                     </span>
//                                 </button>
//                             );
//                         })}
//                     </div>
//                 </div>
//             )}

//             {/* QUANTITY & ACTION */}
//             <div className="space-y-6">
//                 <div className="flex items-center justify-between border-y border-slate-50 py-5">
//                     {/* <div className="flex flex-col gap-1">
//                         <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Quantity</label>
//                         <span className="text-[9px] text-slate-300 uppercase tracking-widest">
//                             {selectedVariant.stock > 0 ? `${selectedVariant.stock} available` : "No stock available"}
//                         </span>
//                     </div> */}
//                     <div className="flex items-center bg-slate-50 p-1 rounded-full border border-slate-100">
//                         <button
//                             disabled={quantity <= 1 || selectedVariant.stock <= 0}
//                             onClick={() => setQuantity(Math.max(1, quantity - 1))}
//                             className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white disabled:opacity-20 transition-colors"
//                         >
//                             <Minus className="w-3 h-3" />
//                         </button>
//                         <span className="w-10 text-center text-sm font-bold tabular-nums">{quantity}</span>
//                         <button
//                             disabled={quantity >= selectedVariant.stock || selectedVariant.stock <= 0}
//                             onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
//                             className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white disabled:opacity-20 transition-colors"
//                         >
//                             <Plus className="w-3 h-3" />
//                         </button>
//                     </div>
//                 </div>

//                 <button
//                     disabled={selectedVariant.stock <= 0}
//                     onClick={handleAddToCart}
//                     className="w-full h-14 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-black active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-400 flex items-center justify-center gap-3 transition-all rounded-none"
//                 >
//                     <ShoppingBag className="w-4 h-4" />
//                     {selectedVariant.stock <= 0 ? "Out of Stock" : "Add to Bag"}
//                 </button>
//             </div>
//         </div>
//     )
// }


"use client"

import { useState } from "react"
import { Minus, Plus, ShoppingBag, Tag, MapPin, Check, AlertCircle, Loader2, Truck } from "lucide-react"
import { toast } from "sonner"
import { useCart, CartItem } from "@/components/store/use-cart"
import { calculateDiscountedPrice } from "@/lib/price-helper"
import { createClient } from "@/utils/supabase/client"

export default function VariantSelector({ product, variants, onVariantChange }: any) {
    const addItem = useCart((state) => state.addItem)
    const supabase = createClient()

    const [selectedVariant, setSelectedVariant] = useState(
        variants.find((v: any) => v.is_default) || variants[0]
    )
    const [quantity, setQuantity] = useState(1)

    // Pincode Checker State
    const [checkPincode, setCheckPincode] = useState("")
    const [pincodeStatus, setPincodeStatus] = useState<{
        loading: boolean;
        checked: boolean;
        available: boolean;
        methods: any[];
    } | null>(null);

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
        setSelectedVariant(v);
        setQuantity(1);
        if (onVariantChange) onVariantChange(v);
    };

    const handleAddToCart = () => {
        if (!selectedVariant || selectedVariant.stock <= 0) return;

        const item: CartItem = {
            id: `${product.id}-${selectedVariant.id}`,
            productId: product.id,
            categoryId: product.category_id,
            variantId: selectedVariant.id,
            name: product.name,
            variantTitle: selectedVariant.title,
            price: salePrice,
            mrp: originalPrice,
            image: selectedVariant.image_url || product.thumbnail_url || "/placeholder.png",
            quantity: quantity,
            stock: selectedVariant.stock
        };

        addItem(item);
        toast.success(`Added ${product.name} - ${selectedVariant.title} to bag`);
    };

    const checkAvailability = async () => {
        if (checkPincode.length !== 6) return toast.error("Enter a valid 6-digit pincode");

        setPincodeStatus({ loading: true, checked: false, available: false, methods: [] });

        try {
            const { data: zones, error } = await supabase
                .from("shipping_zones")
                .select("*, shipping_methods(*)")
                .eq("pincode", checkPincode);

            if (error) throw error;

            if (zones && zones.length > 0) {
                // Flatten all methods from all zones associated with this pincode
                const allMethods = zones.flatMap(z => z.shipping_methods);
                setPincodeStatus({
                    loading: false,
                    checked: true,
                    available: true,
                    methods: allMethods
                });
            } else {
                setPincodeStatus({ loading: false, checked: true, available: false, methods: [] });
            }
        } catch (err) {
            toast.error("Database lookup failed");
            setPincodeStatus(null);
        }
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
                        {variants[0]?.hex_code ? "Select Shade" : "Select Variant"}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {variants.map((v: any) => {
                            const isSelected = selectedVariant.id === v.id;
                            const isOutOfStock = v.stock <= 0;
                            return (
                                <button
                                    key={v.id}
                                    disabled={isOutOfStock}
                                    onClick={() => handleVariantClick(v)}
                                    className={`group flex items-center gap-3 p-3 rounded-md border transition-all duration-200 ${isSelected
                                        ? "border-slate-900 bg-slate-50 ring-[0.5px] ring-slate-900"
                                        : "border-slate-100 bg-white"
                                        } ${isOutOfStock ? "opacity-40 grayscale cursor-not-allowed" : "hover:border-slate-300"}`}
                                >
                                    {v.hex_code ? (
                                        <div className="w-6 h-6 rounded-full border border-black/5" style={{ backgroundColor: v.hex_code }} />
                                    ) : (
                                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase">
                                            {v.title.substring(0, 2)}
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
                    <div className="flex items-center bg-slate-50 p-1 rounded-full border border-slate-100">
                        <button
                            disabled={quantity <= 1 || selectedVariant.stock <= 0}
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white disabled:opacity-20 transition-colors"
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold tabular-nums">{quantity}</span>
                        <button
                            disabled={quantity >= selectedVariant.stock || selectedVariant.stock <= 0}
                            onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white disabled:opacity-20 transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <button
                    disabled={selectedVariant.stock <= 0}
                    onClick={handleAddToCart}
                    className="w-full h-14 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-black active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-400 flex items-center justify-center gap-3 transition-all rounded-none"
                >
                    <ShoppingBag className="w-4 h-4" />
                    {selectedVariant.stock <= 0 ? "Out of Stock" : "Add to Bag"}
                </button>
            </div>

            {/* CHECK DELIVERY SECTION */}
            <div className="mt-12 pt-10 border-t border-slate-100 space-y-5">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Availability
                    </label>
                    <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Verify logistics for your zone</p>
                </div>

                <div className="flex gap-2 p-1 bg-slate-50 rounded-lg border border-slate-100">
                    <input
                        type="text"
                        placeholder="6-DIGIT PINCODE"
                        value={checkPincode}
                        onChange={(e) => setCheckPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="flex-1 bg-transparent px-4 py-3 text-[11px] font-black tracking-[0.2em] outline-none placeholder:text-slate-300"
                    />
                    <button
                        onClick={checkAvailability}
                        disabled={pincodeStatus?.loading || checkPincode.length < 6}
                        className="px-8 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md hover:bg-black transition-all disabled:opacity-30 disabled:grayscale"
                    >
                        {pincodeStatus?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Check"}
                    </button>
                </div>

                {/* RESULTS INTERFACE */}
                {pincodeStatus?.checked && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                        {!pincodeStatus.available ? (
                            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Delivery currently restricted in this zone.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-emerald-600 px-1">
                                    <Check className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Zone Detected</span>
                                </div>

                                <div className="grid gap-2">
                                    {pincodeStatus.methods.map((m: any) => (
                                        <div key={m.id} className="group flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                    <Truck className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{m.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{m.delivery_time_label}</p>
                                                </div>
                                            </div>
                                            <p className="text-[11px] font-black italic tracking-tighter text-slate-900">₹{m.price}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}