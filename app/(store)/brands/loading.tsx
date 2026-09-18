export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="max-w-6xl mx-auto px-5 pt-2 pb-20">
                {/* Title */}
                <div className="mb-7">
                    <div className="h-8 w-32 bg-slate-100 rounded" />
                    <div className="h-4 w-48 bg-slate-100 rounded mt-2" />
                </div>

                {/* Search bar */}
                <div className="h-11 w-full bg-slate-100 rounded-lg mb-7" />

                {/* Exclusive section */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-slate-100" />
                        <div className="h-3 w-20 bg-slate-100 rounded" />
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="aspect-square bg-slate-100 rounded" />
                        ))}
                    </div>
                </div>

                {/* Essentials section */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-slate-100" />
                        <div className="h-3 w-24 bg-slate-100 rounded" />
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="aspect-square bg-slate-100 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
