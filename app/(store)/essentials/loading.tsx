export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            {/* Pink top bar */}
            <div className="h-[2px] bg-slate-100" />

            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-20">
                {/* Subtitle */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-slate-100 rounded" />
                    <div className="h-3 w-28 bg-slate-100 rounded" />
                </div>

                {/* Title */}
                <div className="h-10 w-64 bg-slate-100 rounded mb-2" />
                <div className="h-4 w-48 bg-slate-100 rounded mb-8" />

                {/* Subcategory bubbles */}
                <div className="flex gap-4 overflow-hidden mb-10">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100" />
                            <div className="h-2.5 w-12 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>

                {/* Section header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-[2px] w-8 bg-slate-100" />
                    <div className="h-3 w-36 bg-slate-100 rounded" />
                    <div className="h-[2px] flex-1 bg-slate-100" />
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
