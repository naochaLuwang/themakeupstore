"use client"

import React, { useState, useEffect, use } from "react"
import { createClient } from "@/utils/supabase/client"
import { updateOrderPOS } from "@/app/actions/orders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Save, ArrowLeft, Plus, Search, Tag, Calculator } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function OrderPOSPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: orderId } = use(params)
    const [items, setItems] = useState<any[]>([])
    const [globalDiscount, setGlobalDiscount] = useState(0)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function initPOS() {
            const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
            const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderId)

            if (orderItems) setItems(orderItems)
            if (order) setGlobalDiscount(Number(order.promo_discount_amount || 0))
            setLoading(false)
        }
        initPOS()
    }, [orderId])

    // --- POS ACTIONS ---
    const searchProducts = async (term: string) => {
        setSearchQuery(term)
        if (term.length < 2) return setSearchResults([])

        const { data } = await supabase
            .from('product_variants')
            .select(`*, products(name)`)
            .ilike('sku', `%${term}%`)
            .limit(5)
        setSearchResults(data || [])
    }

 const addItemToOrder = (variant: any) => {
    setItems(prev => {
        // Check if this variant is already in the POS list
        const existingItemIdx = prev.findIndex(
            item => item.product_variant_id === variant.id
        );

        if (existingItemIdx > -1) {
            // If exists, just increment quantity
            const updated = [...prev];
            updated[existingItemIdx].quantity += 1;
            return updated;
        }

        // If new, add the row
        const newItem = {
            id: crypto.randomUUID(), 
            product_id: variant.product_id,
            product_variant_id: variant.id,
            product_name: variant.products.name,
            variant_title: variant.title,
            sku: variant.sku,
            quantity: 1,
            unit_price: variant.price,
            mrp: variant.price 
        };
        return [...prev, newItem];
    });
    
    setSearchQuery("");
    setSearchResults([]);
};

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    }

    const handleSave = async () => {
        setLoading(true)
        const res = await updateOrderPOS(orderId, items, globalDiscount)
        if (res.success) {
            toast.success("Order Synced Successfully")
            router.push('/admin/orders')
        } else {
            toast.error(res.message)
            setLoading(false)
        }
    }

    // --- TOTALS ---
    const subtotal = items.reduce((acc, i) => acc + (Number(i.unit_price) * i.quantity), 0)
    const finalTotal = subtotal - globalDiscount

    if (loading) return <div className="p-20 text-center font-black animate-pulse">BOOTING POS...</div>

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-10">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT: ITEM EDITOR */}
                <div className="lg:col-span-8 space-y-6">
                    <header className="flex justify-between items-center">
                        <Button variant="ghost" onClick={() => router.back()} className="rounded-xl">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                        <h1 className="text-xl font-black uppercase italic">Order Terminal <span className="text-slate-300">#{orderId.slice(0, 8)}</span></h1>
                    </header>

                    {/* Product Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Scan SKU or Search Product..."
                            className="h-14 pl-12 rounded-2xl border-none shadow-sm font-bold"
                            value={searchQuery}
                            onChange={(e) => searchProducts(e.target.value)}
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-16 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                                {searchResults.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => addItemToOrder(v)}
                                        className="w-full p-4 flex justify-between items-center hover:bg-slate-50 border-b last:border-0"
                                    >
                                        <div className="text-left">
                                            <p className="font-bold text-sm">{v.products.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black">{v.sku} - {v.title}</p>
                                        </div>
                                        <p className="font-black text-indigo-600">₹{v.price}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <tr>
                                    <th className="p-6">Description</th>
                                    <th className="p-6">Qty</th>
                                    <th className="p-6">Unit Price (Edit)</th>
                                    <th className="p-6 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map((item, idx) => (
                                    <tr key={item.id} className="group">
                                        <td className="p-6">
                                            <p className="font-bold text-sm">{item.product_name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black">{item.sku}</p>
                                        </td>
                                        <td className="p-6">
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                className="w-16 h-10 rounded-xl text-center font-bold"
                                                onChange={(e) => {
                                                    const updated = [...items];
                                                    updated[idx].quantity = parseInt(e.target.value) || 0;
                                                    setItems(updated);
                                                }}
                                            />
                                        </td>
                                        <td className="p-6">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                <Input
                                                    type="number"
                                                    value={item.unit_price}
                                                    className="w-28 h-10 pl-7 rounded-xl font-bold text-indigo-600"
                                                    onChange={(e) => {
                                                        const updated = [...items];
                                                        updated[idx].unit_price = parseFloat(e.target.value) || 0;
                                                        setItems(updated);
                                                    }}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-4">
                                                <p className="font-black">₹{(item.unit_price * item.quantity).toLocaleString()}</p>
                                                <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT: BILLING SUMMARY */}
                <div className="lg:col-span-4">
                    <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 sticky top-10 shadow-2xl">
                        <div className="flex items-center gap-2 mb-8 opacity-50">
                            <Calculator className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Bill Summary</span>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400 font-bold uppercase text-[10px]">Subtotal</span>
                                <span className="font-bold">₹{subtotal.toLocaleString()}</span>
                            </div>

                            <div className="space-y-3">
                                <label className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-2">
                                    <Tag className="w-3 h-3" /> Extra Discount (₹)
                                </label>
                                <Input
                                    type="number"
                                    value={globalDiscount}
                                    className="bg-white/10 border-white/20 text-white font-black h-12 rounded-xl"
                                    onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Payable</span>
                                <span className="text-4xl font-black italic tracking-tighter">₹{finalTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleSave}
                            className="w-full h-16 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-[1.8rem] mt-10 font-black uppercase tracking-[0.2em] transition-all"
                        >
                            Sync & Process
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}