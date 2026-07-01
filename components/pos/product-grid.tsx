"use client"

import Image from "next/image"
import { Plus, ShoppingBag } from "lucide-react"

function isOutOfStock(variant: any) {
    return (variant.stock ?? 0) <= 0
}

export default function ProductGrid({ products, onAdd }: any) {
    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <ShoppingBag className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">No products found</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {products.map((product: any) =>
                (product.product_variants || []).map((variant: any) => {
                    const oos = isOutOfStock(variant)
                    return (
                        <button
                            key={variant.id}
                            onClick={() => !oos && onAdd(variant, product)}
                            disabled={oos}
                            className={`relative flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                                oos
                                    ? "bg-slate-50 border-slate-100 cursor-not-allowed opacity-60"
                                    : "bg-white border-slate-200 hover:border-slate-900 hover:shadow-md cursor-pointer"
                            }`}
                        >
                            <div className="w-full aspect-square bg-slate-50 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                                {(variant.image_url || product.thumbnail_url) ? (
                                    <Image
                                        src={variant.image_url || product.thumbnail_url}
                                        alt={variant.title || product.name}
                                        width={120}
                                        height={120}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-slate-300">
                                        {product.name.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-semibold text-slate-900 leading-tight line-clamp-1">
                                {product.name}
                            </p>
                            {product.has_variants && variant.title && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{variant.title}</p>
                            )}
                            <div className="flex items-center justify-between w-full mt-1.5">
                                <span className="text-sm font-bold text-slate-900">
                                    ₹{Math.round(variant.price).toLocaleString()}
                                </span>
                                {!oos && (
                                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">
                                        <Plus className="w-3.5 h-3.5" />
                                    </span>
                                )}
                            </div>
                            {oos && (
                                <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-red-500">
                                    Out of Stock
                                </span>
                            )}
                        </button>
                    )
                })
            )}
        </div>
    )
}
