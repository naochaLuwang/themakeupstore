"use client"

import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import Image from "next/image"

function CartItemRow({ item, onUpdateQty, onRemove }: any) {
    return (
        <div className="flex gap-3 p-3 border-b border-slate-100">
            <div className="w-14 h-16 bg-slate-50 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                {item.image ? (
                    <Image src={item.image} alt={item.name} width={56} height={64} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-lg font-bold text-slate-300">{item.name.charAt(0)}</span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 leading-tight line-clamp-1">{item.name}</p>
                {item.variantTitle && (
                    <p className="text-[10px] text-slate-400">{item.variantTitle}</p>
                )}
                <p className="text-xs font-bold text-slate-900 mt-1">₹{item.price.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1.5">
                    <button
                        onClick={() => onUpdateQty(item.variantId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30"
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                        onClick={() => onUpdateQty(item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => onRemove(item.variantId)} className="ml-auto w-6 h-6 rounded flex items-center justify-center hover:bg-red-50">
                        <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function CartPanel({
    items,
    subtotal,
    discountAmount,
    orderDiscount,
    orderDiscountType,
    taxAmount,
    taxRate,
    grandTotal,
    onUpdateQty,
    onRemove,
    onDiscountChange,
    onDiscountTypeChange,
    onClear,
}: any) {
    return (
        <>
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-sm font-bold">Cart</span>
                    <span className="text-xs text-slate-400 font-medium">({items.length})</span>
                </div>
                {items.length > 0 && (
                    <button onClick={onClear} className="text-[10px] font-semibold uppercase text-red-400 hover:text-red-600">
                        Clear
                    </button>
                )}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                        <ShoppingBag className="w-10 h-10 mb-2" />
                        <p className="text-xs font-medium">Cart is empty</p>
                    </div>
                ) : (
                    items.map((item: any) => (
                        <CartItemRow key={item.variantId} item={item} onUpdateQty={onUpdateQty} onRemove={onRemove} />
                    ))
                )}
            </div>

            {/* Summary */}
            {items.length > 0 && (
                <div className="border-t p-4 space-y-2 bg-slate-50/50">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                    </div>

                    {/* Order Discount */}
                    <div className="flex items-center gap-2">
                        <select
                            value={orderDiscountType}
                            onChange={e => onDiscountTypeChange(e.target.value)}
                            className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white"
                        >
                            <option value="amount">₹</option>
                            <option value="percentage">%</option>
                        </select>
                        <input
                            type="number"
                            min={0}
                            value={orderDiscount || ""}
                            onChange={e => onDiscountChange(parseFloat(e.target.value) || 0)}
                            placeholder="Discount"
                            className="flex-1 h-7 text-xs text-right border border-slate-200 rounded px-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                        />
                        {discountAmount > 0 && (
                            <span className="text-xs font-medium text-emerald-600">-₹{discountAmount.toLocaleString()}</span>
                        )}
                    </div>

                    {taxRate > 0 && (
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Tax ({taxRate}%)</span>
                            <span className="font-semibold">₹{taxAmount.toLocaleString()}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-sm font-bold border-t pt-2">
                        <span>Total</span>
                        <span>₹{grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            )}
        </>
    )
}
