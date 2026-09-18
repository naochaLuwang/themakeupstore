export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
                {/* Title */}
                <div className="h-7 w-32 bg-slate-100 rounded mb-8" />

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: Checkout form */}
                    <div className="flex-1 space-y-8">
                        {/* Address section */}
                        <div>
                            <div className="h-5 w-40 bg-slate-100 rounded mb-4" />
                            <div className="space-y-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
                                ))}
                            </div>
                            <div className="h-10 w-36 bg-slate-100 rounded-xl mt-3" />
                        </div>

                        {/* Payment method */}
                        <div>
                            <div className="h-5 w-36 bg-slate-100 rounded mb-4" />
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-14 bg-slate-100 rounded-xl" />
                                ))}
                            </div>
                        </div>

                        {/* Promo code */}
                        <div>
                            <div className="h-5 w-28 bg-slate-100 rounded mb-3" />
                            <div className="flex gap-2">
                                <div className="h-11 flex-1 bg-slate-100 rounded-xl" />
                                <div className="h-11 w-24 bg-slate-100 rounded-xl" />
                            </div>
                        </div>
                    </div>

                    {/* Right: Order summary */}
                    <div className="lg:w-[360px] shrink-0">
                        <div className="bg-slate-50 rounded-2xl p-6 space-y-4 sticky top-24">
                            <div className="h-5 w-32 bg-slate-100 rounded" />

                            {/* Items */}
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-14 h-14 bg-slate-100 rounded-xl shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 w-3/4 bg-slate-100 rounded" />
                                            <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
                                        </div>
                                        <div className="h-3 w-12 bg-slate-100 rounded" />
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-slate-200 pt-3 space-y-2">
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
            </div>
        </div>
    )
}
