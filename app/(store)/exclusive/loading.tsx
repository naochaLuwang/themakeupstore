export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-20">
                {/* Title */}
                <div className="mb-6">
                    <div className="h-8 w-36 bg-slate-100 rounded" />
                    <div className="h-4 w-48 bg-slate-100 rounded mt-2" />
                </div>

                {/* Subcategory circles */}
                <div className="flex gap-4 overflow-hidden mb-8">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 shrink-0" />
                    ))}
                </div>

                {/* Filter chips */}
                <div className="flex gap-2 mb-6 overflow-hidden">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-9 w-20 bg-slate-100 rounded-full shrink-0" />
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
