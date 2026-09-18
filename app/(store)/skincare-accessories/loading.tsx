export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="max-w-6xl mx-auto px-5 pt-2 pb-20">
                {/* Title */}
                <div className="mb-6">
                    <div className="h-9 w-56 bg-slate-100 rounded" />
                    <div className="h-4 w-40 bg-slate-100 rounded mt-2" />
                </div>

                {/* Product grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="aspect-square bg-slate-100 rounded-2xl" />
                            <div className="h-2.5 w-16 bg-slate-100 rounded" />
                            <div className="h-3.5 w-full bg-slate-100 rounded" />
                            <div className="h-3 w-14 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>

                {/* Load more */}
                <div className="flex justify-center mt-10">
                    <div className="h-11 w-36 bg-slate-100 rounded-xl" />
                </div>
            </div>
        </div>
    )
}
