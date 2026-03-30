"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Plus, Trash2, Search, Loader2, Package, X, ChevronRight, Building, Phone, Mail, Check, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export default function PurchaseClient({ initialSuppliers, initialProducts }: any) {
    const [suppliersList, setSuppliersList] = useState<any[]>(initialSuppliers || [])
    const [selectedItems, setSelectedItems] = useState<any[]>([])
    
    // Supplier Combobox State
    const [supplierId, setSupplierId] = useState("")
    const [supplierSearch, setSupplierSearch] = useState("")
    const [isSupplierOpen, setIsSupplierOpen] = useState(false)
    const supplierDropdownRef = useRef<HTMLDivElement>(null)

    // Product Search Combobox State
    const [productSearchQuery, setProductSearchQuery] = useState("")
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false)
    const productDropdownRef = useRef<HTMLDivElement>(null)

    const [reference, setReference] = useState("")
    const [loading, setLoading] = useState(false)

    // Vendor Modal States
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false)
    const [newVendorName, setNewVendorName] = useState("")
    const [newVendorEmail, setNewVendorEmail] = useState("")
    const [newVendorPhone, setNewVendorPhone] = useState("")
    const [isCreatingVendor, setIsCreatingVendor] = useState(false)

    const supabase = createClient()

    // Handle clicks outside of dropdowns
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
                setIsSupplierOpen(false)
            }
            if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
                setIsProductSearchOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const filteredSuppliers = useMemo(() => {
        return suppliersList.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
    }, [supplierSearch, suppliersList])

    const filteredProducts = useMemo(() => {
        if (!productSearchQuery.trim()) return []
        const query = productSearchQuery.toLowerCase()
        return initialProducts.filter((p: any) => {
            const productNameMatch = p.name.toLowerCase().includes(query)
            const variantMatch = p.product_variants.some((v: any) =>
                v.title.toLowerCase().includes(query)
            )
            return productNameMatch || variantMatch
        })
    }, [productSearchQuery, initialProducts])

    // Find the currently selected supplier name for display
    const selectedSupplierName = useMemo(() => {
        const s = suppliersList.find(sup => sup.id === supplierId)
        return s ? s.name : ""
    }, [supplierId, suppliersList])

    useEffect(() => {
        if (selectedSupplierName && !isSupplierOpen) {
            setSupplierSearch(selectedSupplierName)
        }
    }, [selectedSupplierName, isSupplierOpen])

    const addItem = (variant: any, productName: string) => {
        if (selectedItems.find(i => i.variant_id === variant.id)) {
            toast.error("Item already added")
            return
        }
        setSelectedItems([...selectedItems, {
            variant_id: variant.id,
            name: `${productName} (${variant.title})`,
            quantity: 1,
            unit_cost: variant.price || 0
        }])
        setProductSearchQuery("")
        setIsProductSearchOpen(false)
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

            toast.success("Purchase order saved successfully")
            setSelectedItems([]); setReference(""); setSupplierId(""); setSupplierSearch("");
        } catch (err: any) { toast.error(err.message) }
        finally { setLoading(false) }
    }

    const handleCreateVendor = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newVendorName.trim()) return toast.error("Vendor name is required")
        setIsCreatingVendor(true)
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .insert({
                    name: newVendorName.trim(),
                    email: newVendorEmail.trim() || null,
                    phone: newVendorPhone.trim() || null
                })
                .select()
                .single()
            
            if (error) throw error
            
            setSuppliersList([data, ...suppliersList])
            setSupplierId(data.id)
            setSupplierSearch(data.name)
            toast.success("Vendor created successfully")
            setIsVendorModalOpen(false)
            setNewVendorName("")
            setNewVendorEmail("")
            setNewVendorPhone("")
        } catch (err: any) {
            toast.error(err.message || "Failed to create vendor")
        } finally {
            setIsCreatingVendor(false)
        }
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Main Section - Removed Compact Sidebar for wider layout */}
            <main className="flex-1 w-full">
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
                            className="h-9 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 transition-all"
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
                            <div className="space-y-1.5 flex flex-col relative" ref={supplierDropdownRef}>
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vendor</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsVendorModalOpen(true)}
                                        className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> New Vendor
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input
                                        placeholder="Search supplier..."
                                        value={isSupplierOpen ? supplierSearch : (selectedSupplierName || supplierSearch)}
                                        onChange={e => {
                                            setSupplierSearch(e.target.value)
                                            setIsSupplierOpen(true)
                                            if (e.target.value === "") setSupplierId("")
                                        }}
                                        onFocus={() => {
                                            setIsSupplierOpen(true)
                                            setSupplierSearch("")
                                        }}
                                        className="h-10 text-sm bg-slate-50 focus:bg-white transition-all cursor-text pr-8"
                                    />
                                    <ChevronRight className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isSupplierOpen ? 'rotate-90' : ''}`} />
                                </div>
                                
                                {/* Searchable Supplier Dropdown */}
                                {isSupplierOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                        {filteredSuppliers.length === 0 ? (
                                            <div className="p-4 text-sm text-slate-500 text-center">No suppliers found.</div>
                                        ) : (
                                            <ul className="py-1">
                                                {filteredSuppliers.map(s => (
                                                    <li 
                                                        key={s.id}
                                                        onClick={() => {
                                                            setSupplierId(s.id)
                                                            setSupplierSearch(s.name)
                                                            setIsSupplierOpen(false)
                                                        }}
                                                        className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${supplierId === s.id ? 'bg-indigo-50 text-indigo-700 font-medium' : ''}`}
                                                    >
                                                        {s.name}
                                                        {supplierId === s.id && <Check className="w-4 h-4 text-indigo-600" />}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reference No.</label>
                                <Input
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    placeholder="e.g. PO-2024-001"
                                    className="h-10 text-sm bg-slate-50 focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* LINE ITEMS */}
                        <div className="bg-white border rounded-lg overflow-visible flex flex-col">
                            {/* Inline Add Item Search Header */}
                            <div className="p-4 border-b bg-slate-50/50 relative z-20" ref={productDropdownRef}>
                                <div className="relative max-w-md mx-auto w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                    <Input
                                        placeholder="Search and add line items..."
                                        value={productSearchQuery}
                                        onChange={e => {
                                            setProductSearchQuery(e.target.value)
                                            setIsProductSearchOpen(true)
                                        }}
                                        onFocus={() => setIsProductSearchOpen(true)}
                                        className="pl-9 h-10 w-full bg-white shadow-sm transition-all focus:ring-2 ring-indigo-500/10 text-sm font-medium"
                                    />
                                    
                                    {/* Inline Product Search Dropdown */}
                                    {isProductSearchOpen && productSearchQuery.trim() !== "" && (
                                        <div className="absolute top-full mt-2 left-0 right-0 bg-white border rounded-lg shadow-2xl z-30 max-h-80 overflow-y-auto w-[150%] -ml-[25%] animate-in fade-in zoom-in-95 origin-top">
                                            {filteredProducts.length === 0 ? (
                                                <div className="p-8 text-center flex flex-col items-center">
                                                    <Package className="w-8 h-8 text-slate-200 mb-2" />
                                                    <span className="text-sm font-semibold text-slate-500">No products found</span>
                                                    <span className="text-xs text-slate-400">Try adjusting your search</span>
                                                </div>
                                            ) : (
                                                <div className="divide-y">
                                                    {filteredProducts.map((p: any) => (
                                                        <div key={p.id} className="p-3">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{p.brand || 'No Brand'}</div>
                                                            <div className="font-semibold text-sm mb-2 text-slate-800">{p.name}</div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {p.product_variants.map((v: any) => {
                                                                    const isAdded = selectedItems.find(i => i.variant_id === v.id)
                                                                    return (
                                                                        <button
                                                                            key={v.id}
                                                                            onClick={() => addItem(v, p.name)}
                                                                            disabled={!!isAdded}
                                                                            className={`flex items-center justify-between p-2 rounded border text-left text-xs transition-all ${isAdded ? 'bg-slate-50 border-transparent opacity-50 cursor-not-allowed' : 'bg-white hover:border-indigo-600 hover:bg-slate-50'}`}
                                                                        >
                                                                            <span className="font-medium truncate mr-2">{v.title}</span>
                                                                            {isAdded ? <Check className="w-3 h-3 text-slate-400 flex-shrink-0" /> : <Plus className="w-3 h-3 text-indigo-600 flex-shrink-0" />}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {selectedItems.length > 0 ? (
                                <table className="w-full text-left border-collapse z-10 relative">
                                    <thead className="bg-slate-50/80 border-b">
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
                                                <td className="px-6 py-4 text-right text-sm font-medium text-slate-600 bg-slate-50/30">
                                                    ₹{(item.quantity * item.unit_cost).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <button onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}>
                                                        <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500 transition-colors" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-16 text-center text-slate-400 relative z-10">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Package className="w-8 h-8 opacity-40 text-slate-500" />
                                    </div>
                                    <p className="text-sm font-medium mb-1 text-slate-600">No items added</p>
                                    <p className="text-xs">Search and select items from above to populate the order.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT SUMMARY */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="bg-white border rounded-lg p-6 sticky top-24">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <List className="w-4 h-4 text-indigo-600" /> Order Summary
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-medium">Subtotal</span>
                                    <span className="font-semibold text-slate-700">₹{selectedItems.reduce((acc, i) => acc + (i.quantity * i.unit_cost), 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-medium">Item Count</span>
                                    <span className="font-semibold text-slate-700">{selectedItems.reduce((acc, i) => acc + i.quantity, 0)} Units</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t pt-4">
                                    <span>Grand Total</span>
                                    <span className="text-indigo-600 text-xl tracking-tight">₹{selectedItems.reduce((acc, i) => acc + (i.quantity * i.unit_cost), 0).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <Button
                                className="w-full h-12 mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-900/10 transition-all"
                                disabled={loading || !supplierId || selectedItems.length === 0}
                                onClick={handleCreatePO}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                Complete Purchase
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* NEW VENDOR MODAL */}
            {isVendorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Building className="w-5 h-5 text-indigo-600" />
                                <h2 className="font-bold">Add New Vendor</h2>
                            </div>
                            <button onClick={() => setIsVendorModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" /></button>
                        </div>
                        <form onSubmit={handleCreateVendor} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company/Vendor Name *</label>
                                <Input 
                                    value={newVendorName} 
                                    onChange={e => setNewVendorName(e.target.value)} 
                                    placeholder="e.g. Acme Corp" 
                                    required
                                    autoFocus
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        type="email"
                                        value={newVendorEmail} 
                                        onChange={e => setNewVendorEmail(e.target.value)} 
                                        placeholder="contact@acme.com" 
                                        className="pl-10 h-11"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        type="tel"
                                        value={newVendorPhone} 
                                        onChange={e => setNewVendorPhone(e.target.value)} 
                                        placeholder="+1 234 567 8900" 
                                        className="pl-10 h-11"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex items-center justify-end gap-3 mt-2">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => setIsVendorModalOpen(false)}
                                    className="text-xs font-bold uppercase tracking-widest h-10"
                                    disabled={isCreatingVendor}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isCreatingVendor || !newVendorName.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase tracking-widest px-6 h-10 transition-all shadow-md shadow-indigo-600/20"
                                >
                                    {isCreatingVendor ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                    Save Vendor
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}