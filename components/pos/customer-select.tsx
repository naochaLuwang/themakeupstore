"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { User, Check, ChevronDown, Search, Plus, Phone } from "lucide-react"

export default function CustomerSelect({ customers, selected, onSelect, onCreateCustomer }: any) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [showCreate, setShowCreate] = useState(false)
    const [newPhone, setNewPhone] = useState("")
    const [newName, setNewName] = useState("")
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
                setShowCreate(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    const filtered = useMemo(() => {
        if (!query.trim()) return customers
        const q = query.toLowerCase()
        return customers.filter(
            (c: any) =>
                c.name?.toLowerCase().includes(q) ||
                c.phone?.includes(q)
        )
    }, [customers, query])

    const handleCreate = async () => {
        if (!newPhone.trim()) return
        const customer = await onCreateCustomer(newPhone.trim(), newName.trim() || undefined)
        if (customer) {
            setOpen(false)
            setShowCreate(false)
            setNewPhone("")
            setNewName("")
            setQuery("")
        }
    }

    const showCreateForm = showCreate || (query.trim() && filtered.length === 0 && query.length >= 3)

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full h-11 px-3 flex items-center gap-2 border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-all text-left"
            >
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className={`text-sm flex-1 ${selected ? "font-medium text-slate-900" : "text-slate-400"}`}>
                    {selected ? selected.name || selected.phone : "Walk-in Customer"}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="w-full h-8 pl-8 pr-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"
                                autoFocus
                            />
                        </div>
                    </div>

                    {showCreateForm ? (
                        <div className="p-3 space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Customer</p>
                            <input
                                type="tel"
                                placeholder="Phone *"
                                value={newPhone}
                                onChange={e => setNewPhone(e.target.value)}
                                className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"
                                autoFocus
                            />
                            <input
                                type="text"
                                placeholder="Name (optional)"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!newPhone.trim()}
                                className="w-full h-8 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-3 h-3 inline mr-1" /> Add & Select
                            </button>
                        </div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto">
                            <button
                                onClick={() => { onSelect(null); setOpen(false); setQuery("") }}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                                    !selected ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-500"
                                }`}
                            >
                                <User className="w-3.5 h-3.5" />
                                Walk-in Customer
                                {!selected && <Check className="w-3.5 h-3.5 ml-auto text-indigo-600" />}
                            </button>
                            <div className="border-t border-slate-100" />
                            {filtered.map((c: any) => (
                                <button
                                    key={c.id}
                                    onClick={() => { onSelect(c); setOpen(false); setQuery("") }}
                                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                                        selected?.id === c.id ? "bg-indigo-50 text-indigo-700 font-medium" : ""
                                    }`}
                                >
                                    <div>
                                        <p className="text-sm font-medium">{c.name || "Unknown"}</p>
                                        {c.phone && (
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {c.phone}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {selected?.id === c.id && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-auto" />}
                                        {c.total_visits > 0 && (
                                            <p className="text-[9px] text-slate-400">{c.total_visits} visits</p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
