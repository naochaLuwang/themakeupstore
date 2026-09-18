export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="max-w-2xl mx-auto px-5 pt-2 pb-24">
                {/* Title */}
                <div className="mb-6">
                    <div className="h-9 w-40 bg-slate-100 rounded" />
                    <div className="h-5 w-56 bg-slate-100 rounded mt-2" />
                </div>

                {/* Category cards */}
                <div className="space-y-[18px]">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-[180px] bg-slate-100 rounded-[26px]" />
                    ))}
                </div>
            </div>
        </div>
    )
}
