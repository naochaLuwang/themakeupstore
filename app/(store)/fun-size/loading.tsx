export default function Loading() {
    return (
        <div className="bg-white animate-pulse">
            {/* Hero */}
            <div className="w-full h-[540px] bg-slate-100" />

            <div className="mt-6">
                {/* Section header */}
                <div className="flex items-end justify-between px-4 mb-5">
                    <div>
                        <div className="h-3 w-24 bg-slate-100 rounded" />
                        <div className="h-6 w-32 bg-slate-100 rounded mt-1" />
                    </div>
                </div>

                {/* Product grid */}
                <div className="grid grid-cols-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="p-2 space-y-2">
                            <div className="aspect-square bg-slate-100 rounded" />
                            <div className="h-2.5 w-16 bg-slate-100 rounded" />
                            <div className="h-3.5 w-full bg-slate-100 rounded" />
                            <div className="h-3 w-12 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
