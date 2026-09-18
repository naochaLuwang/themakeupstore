export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
                {/* Breadcrumb */}
                <div className="flex gap-2 mb-6">
                    <div className="h-3 w-12 bg-slate-100 rounded" />
                    <div className="h-3 w-12 bg-slate-100 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>

                {/* Title */}
                <div className="flex items-center justify-between mb-6">
                    <div className="h-7 w-40 bg-slate-100 rounded" />
                    <div className="h-4 w-20 bg-slate-100 rounded" />
                </div>

                {/* Free shipping bar */}
                <div className="h-2 w-full bg-slate-100 rounded-full mb-8" />

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Cart items */}
                    <div className="flex-1 space-y-6">
                        {/* Table header - desktop */}
                        <div className="hidden md:flex items-center gap-4 pb-3 border-b border-slate-100">
                            <div className="h-3 w-20 bg-slate-100 rounded" />
                            <div className="flex-1" />
                            <div className="h-3 w-12 bg-slate-100 rounded" />
                            <div className="h-3 w-16 bg-slate-100 rounded" />
                            <div className="h-3 w-16 bg-slate-100 rounded" />
                        </div>

                        {/* Cart item rows */}
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4 py-4 border-b border-slate-50">
                                <div className="w-20 h-24 md:w-24 md:h-28 bg-slate-100 rounded-xl shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-slate-100 rounded" />
                                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                                    <div className="h-4 w-16 bg-slate-100 rounded" />
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                                        <div className="h-8 w-10 bg-slate-100 rounded-lg" />
                                        <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Coupon */}
                        <div className="flex gap-2 mt-4">
                            <div className="h-11 flex-1 bg-slate-100 rounded-xl" />
                            <div className="h-11 w-24 bg-slate-100 rounded-xl" />
                        </div>
                    </div>

                    {/* Order summary sidebar */}
                    <div className="lg:w-[340px] shrink-0">
                        <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                            <div className="h-5 w-32 bg-slate-100 rounded" />
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <div className="h-3 w-20 bg-slate-100 rounded" />
                                    <div className="h-3 w-12 bg-slate-100 rounded" />
                                </div>
                                <div className="flex justify-between">
                                    <div className="h-3 w-16 bg-slate-100 rounded" />
                                    <div className="h-3 w-12 bg-slate-100 rounded" />
                                </div>
                                <div className="flex justify-between">
                                    <div className="h-3 w-24 bg-slate-100 rounded" />
                                    <div className="h-3 w-12 bg-slate-100 rounded" />
                                </div>
                            </div>
                            <div className="border-t border-slate-200 pt-3">
                                <div className="flex justify-between">
                                    <div className="h-4 w-20 bg-slate-100 rounded" />
                                    <div className="h-4 w-16 bg-slate-100 rounded" />
                                </div>
                            </div>
                            <div className="h-12 w-full bg-slate-100 rounded-xl mt-2" />
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="mt-12">
                    <div className="h-5 w-40 bg-slate-100 rounded mb-4" />
                    <div className="flex gap-3 overflow-hidden">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-36 shrink-0 space-y-2">
                                <div className="aspect-square bg-slate-100 rounded-xl" />
                                <div className="h-3 w-16 bg-slate-100 rounded" />
                                <div className="h-3 w-12 bg-slate-100 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
