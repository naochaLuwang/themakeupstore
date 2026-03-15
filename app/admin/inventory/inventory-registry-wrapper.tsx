// app/admin/inventory/inventory-registry-wrapper.tsx
"use client"

import React, { useState, useMemo } from "react"
import { Search, Filter, Package, AlertTriangle, XCircle } from "lucide-react"
import { InventoryTableClient } from "@/components/admin/inventory-table-client"

export default function InventoryRegistryWrapper({ initialInventory, categories }: any) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [stockStatus, setStockStatus] = useState("all")

    const filteredInventory = useMemo(() => {
        return initialInventory.filter((item: any) => {
            const matchesSearch =
                item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesCategory = selectedCategory === "all" ||
                item.products?.product_categories?.some((pc: any) => pc.category_id === selectedCategory)

            let matchesStatus = true
            if (stockStatus === "out") matchesStatus = item.stock === 0
            if (stockStatus === "low") matchesStatus = item.stock > 0 && item.stock <= 10

            return matchesSearch && matchesCategory && matchesStatus
        })
    }, [searchQuery, selectedCategory, stockStatus, initialInventory])

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 sticky top-4 z-30">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        className="w-full pl-11 pr-4 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-4 ring-slate-900/5 outline-none font-bold text-sm"
                        placeholder="Search SKU or Product..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="pl-6 pr-8 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest min-w-[140px] appearance-none"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <select
                        value={stockStatus}
                        onChange={(e) => setStockStatus(e.target.value)}
                        className="pl-6 pr-8 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest min-w-[140px] appearance-none"
                    >
                        <option value="all">Stock Filter</option>
                        <option value="low">Low Stock</option>
                        <option value="out">Out of Stock</option>
                    </select>
                </div>
            </div>

            <InventoryTableClient filteredInventory={filteredInventory} />
        </div>
    )
}