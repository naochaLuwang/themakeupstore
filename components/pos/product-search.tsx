"use client"

import { Search } from "lucide-react"

export default function ProductSearch({ value, onChange }: any) {
    return (
        <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all"
                autoFocus
            />
        </div>
    )
}
