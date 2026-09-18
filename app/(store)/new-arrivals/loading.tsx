export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-20">
                {/* Breadcrumb */}
                <div className="flex gap-2 mb-6">
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>

                {/* Title + filter */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="h-9 w-48 bg-slate-100 rounded" />
                        <div className="h-3 w-40 bg-slate-100 rounded mt-2" />
                    </div>
                    <div className="h-10 w-32 bg-slate-100 rounded-lg" />
                </div>

                {/* Product grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-3">
                            <div className="aspect-square bg-slate-100 rounded-2xl" />
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
