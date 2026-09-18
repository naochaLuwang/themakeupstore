export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-20">
                {/* Title + count */}
                <div className="mb-4">
                    <div className="h-7 w-40 bg-slate-100 rounded" />
                    <div className="h-3 w-28 bg-slate-100 rounded mt-2" />
                </div>

                {/* Subcategory circles */}
                <div className="flex gap-3 overflow-hidden mb-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-14 h-14 rounded-full bg-slate-100 shrink-0" />
                    ))}
                </div>

                {/* Product grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-10">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="aspect-[4/5] bg-slate-100 rounded-lg" />
                            <div className="h-2.5 w-16 bg-slate-100 rounded" />
                            <div className="h-3.5 w-full bg-slate-100 rounded" />
                            <div className="h-3 w-14 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
