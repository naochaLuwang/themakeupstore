"use client"

import { Pencil, Trash2, Check } from "lucide-react"

interface AddressCardProps {
    addr: any
    isSelected: boolean
    onSelect: (addr: any) => void
    onEdit: (addr: any) => void
    onDelete: (id: string) => void
}

export function AddressCard({ addr, isSelected, onSelect, onEdit, onDelete }: AddressCardProps) {
    return (
        <div className="relative mb-3 group">
            <div
                onClick={() => onSelect(addr)}
                className={`relative z-10 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-stretch overflow-hidden ${isSelected
                        ? 'border-slate-900 bg-white shadow-md'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
            >
                {/* 1. Selection Area (Left + Center) */}
                <div className="flex-1 p-5 flex items-start gap-4">
                    <div className="mt-1 shrink-0">
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-200'
                            }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                            {addr.label}
                        </span>
                        <p className="text-sm font-bold text-slate-900 leading-none">{addr.full_name}</p>
                        <p className="text-[11px] text-slate-500 leading-snug">
                            {addr.street}, {addr.city}
                        </p>
                    </div>
                </div>

                {/* 2. Action Toolbar (Right) */}
                {/* We give this a subtle background to make the "Hidden" actions visible */}
                <div className="flex flex-col border-l border-slate-50 bg-slate-50/50 w-12 shrink-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(addr);
                        }}
                        className="flex-1 flex items-center justify-center text-slate-400 hover:text-black hover:bg-slate-100 transition-all border-b border-slate-100"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(addr.id);
                        }}
                        className="flex-1 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}