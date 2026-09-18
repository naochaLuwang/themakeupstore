export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            {/* Sticky toolbar */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="h-4 w-24 bg-slate-100 rounded" />
                    <div className="flex gap-2">
                        <div className="h-9 w-20 bg-slate-100 rounded-lg" />
                        <div className="h-9 w-20 bg-slate-100 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Product grid */}
            <div className="max-w-7xl mx-auto px-4 py-6">
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
