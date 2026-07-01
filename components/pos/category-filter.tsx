"use client"

export default function CategoryFilter({ categories, active, onChange }: any) {
    return (
        <div className="flex items-center gap-2 px-5 py-3 border-b overflow-x-auto shrink-0">
            <button
                onClick={() => onChange(null)}
                className={`shrink-0 h-8 px-4 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                    active === null
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
            >
                All
            </button>
            {categories.map((cat: any) => (
                <button
                    key={cat.id}
                    onClick={() => onChange(active === cat.id ? null : cat.id)}
                    className={`shrink-0 h-8 px-4 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                        active === cat.id
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    )
}
