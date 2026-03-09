"use client"

import { useState, useMemo } from "react"
import { Plus, Trash2, Search, Loader2, Package, X, ChevronRight, LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export default function PurchaseClient({ initialSuppliers, initialProducts }: any) {
    const [selectedItems, setSelectedItems] = useState<any[]>([])
    const [supplierId, setSupplierId] = useState("")
    const [reference, setReference] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const supabase = createClient()

    const filteredProducts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return initialProducts.filter((p: any) => {
            const productNameMatch = p.name.toLowerCase().includes(query);
            const variantMatch = p.product_variants.some((v: any) =>
                v.title.toLowerCase().includes(query)
            );
            return productNameMatch || variantMatch;
        })
    }, [searchQuery, initialProducts])

    const addItem = (variant: any, productName: string) => {
        if (selectedItems.find(i => i.variant_id === variant.id)) return
        setSelectedItems([...selectedItems, {
            variant_id: variant.id,
            name: `${productName} (${variant.title})`,
            quantity: 1,
            unit_cost: variant.price || 0
        }])
    }

    const handleCreatePO = async () => {
        setLoading(true)
        try {
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .insert({ supplier_id: supplierId, reference_number: reference, status: 'draft' })
                .select().single()
            if (poError) throw poError

            const { error: itemsError } = await supabase.from('purchase_order_items').insert(
                selectedItems.map(item => ({
                    purchase_order_id: po.id,
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    unit_cost: item.unit_cost
                }))
            )
            if (itemsError) throw itemsError
            toast.success("Purchase order saved")
            setSelectedItems([]); setReference(""); setSupplierId("");
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* COMPACT SIDEBAR (Visual Only) */}
            <aside className="w-16 border-r bg-white hidden md:flex flex-col items-center py-6 gap-6">
                <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">A</div>
                <LayoutGrid className="w-5 h-5 text-slate-400" />
                <Package className="w-5 h-5 text-indigo-600" />
                <List className="w-5 h-5 text-slate-400" />
            </aside>

            <main className="flex-1">
                {/* TOOLBAR */}
                <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-slate-400">Inventory</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        <span>Create Purchase Order</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-9 px-4 text-xs font-semibold" onClick={() => setSelectedItems([])}>Clear</Button>
                        <Button
                            className="h-9 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
                            disabled={loading || !supplierId || selectedItems.length === 0}
                            onClick={handleCreatePO}
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Plus className="w-3 h-3 mr-2" />}
                            Save Purchase Order
                        </Button>
                    </div>
                </header>

                <div className="p-8 max-w-6xl mx-auto grid grid-cols-12 gap-6">
                    {/* LEFT FORM */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        {/* SUPPLIER & HEADER */}
                        <div className="bg-white border rounded-lg p-6 grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vendor</label>
                                <select
                                    value={supplierId}
                                    onChange={e => setSupplierId(e.target.value)}
                                    className="w-full h-10 border rounded px-3 text-sm bg-slate-50 focus:bg-white focus:ring-2 ring-indigo-500/10 outline-none transition-all"
                                >
                                    <option value="">Select a supplier...</option>
                                    {initialSuppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reference No.</label>
                                <Input
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    placeholder="e.g. PO-2024-001"
                                    className="h-10 text-sm"
                                />
                            </div>
                        </div>

                        {/* LINE ITEMS */}
                        <div className="bg-white border rounded-lg overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32">Qty</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-40">Unit Cost</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32 text-right">Total</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {selectedItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold">{item.name}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Input
                                                    type="number"
                                                    // FIX: Fallback to empty string if NaN to avoid the warning
                                                    value={item.quantity || ""}
                                                    onChange={e => {
                                                        const val = parseInt(e.target.value);
                                                        const copy = [...selectedItems];
                                                        copy[idx].quantity = isNaN(val) ? 0 : val;
                                                        setSelectedItems(copy);
                                                    }}
                                                    className="h-9 text-sm"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <Input
                                                    type="number"
                                                    value={item.unit_cost || ""}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        const copy = [...selectedItems];
                                                        copy[idx].unit_cost = isNaN(val) ? 0 : val;
                                                        setSelectedItems(copy);
                                                    }}
                                                    className="h-9 text-sm text-right"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-slate-600">
                                                ₹{(item.quantity * item.unit_cost).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-4">
                                                <button onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}>
                                                    <X className="w-4 h-4 text-slate-300 hover:text-red-500" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {selectedItems.length === 0 && (
                                <div className="p-12 text-center text-slate-400">
                                    <Package className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No items added to this purchase order.</p>
                                    <button onClick={() => setIsModalOpen(true)} className="text-xs font-bold text-indigo-600 mt-2 uppercase tracking-widest hover:underline">Add Items</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT SUMMARY */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="bg-white border rounded-lg p-6">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">Summary</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span>₹{selectedItems.reduce((acc, i) => acc + (i.quantity * i.unit_cost), 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t pt-3">
                                    <span>Grand Total</span>
                                    <span className="text-indigo-600 text-lg">₹{selectedItems.reduce((acc, i) => acc + (i.quantity * i.unit_cost), 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full h-12 border-dashed border-2 hover:border-indigo-600 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest"
                            onClick={() => setIsModalOpen(true)}
                        >
                            + Add Items from Catalog
                        </Button>
                    </div>
                </div>
            </main>

            {/* CATALOG MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="font-bold">Select Products</h2>
                            <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-4 bg-slate-50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search by name..."
                                    className="pl-10 h-10 bg-white"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y">
                            {filteredProducts.map((p: any) => (
                                <div key={p.id} className="p-4 space-y-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.brand || 'Brand'}</p>
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold">{p.name}</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {p.product_variants.map((v: any) => (
                                            <button
                                                key={v.id}
                                                onClick={() => addItem(v, p.name)}
                                                className="flex items-center justify-between p-3 rounded border bg-slate-50 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-xs"
                                            >
                                                <span className="font-medium">{v.title}</span>
                                                <Plus className="w-3 h-3 text-indigo-600" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t text-right bg-slate-50 rounded-b-xl">
                            <Button className="h-9 px-6 text-xs font-bold uppercase tracking-widest bg-slate-900" onClick={() => setIsModalOpen(false)}>Done</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}