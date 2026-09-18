export default function Loading() {
    return (
        <div className="bg-white animate-pulse">
            {/* Mobile */}
            <div className="md:hidden">
                {/* Image gallery */}
                <div className="w-full aspect-[1/0.85] bg-slate-100" />
                <div className="flex justify-center gap-1.5 py-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-slate-300' : 'bg-slate-100'}`} />
                    ))}
                </div>

                {/* Product info */}
                <div className="px-4 pt-4 space-y-3">
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                    <div className="h-5 w-3/4 bg-slate-100 rounded" />
                    <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="w-3.5 h-3.5 bg-slate-100 rounded" />
                            ))}
                        </div>
                        <div className="h-3 w-16 bg-slate-100 rounded" />
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 pt-1">
                        <div className="h-6 w-24 bg-slate-100 rounded" />
                        <div className="h-4 w-16 bg-slate-100 rounded" />
                        <div className="h-5 w-12 bg-slate-100 rounded-full" />
                    </div>

                    {/* Variant selector */}
                    <div className="pt-2">
                        <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-50" />
                            ))}
                        </div>
                    </div>

                    {/* Quantity + Add to cart */}
                    <div className="flex gap-3 pt-3">
                        <div className="h-12 w-28 bg-slate-100 rounded-xl" />
                        <div className="h-12 flex-1 bg-slate-100 rounded-xl" />
                    </div>

                    {/* Delivery check */}
                    <div className="h-12 w-full bg-slate-100 rounded-xl mt-2" />

                    {/* Description */}
                    <div className="pt-4 space-y-2">
                        <div className="h-4 w-full bg-slate-100 rounded" />
                        <div className="h-4 w-5/6 bg-slate-100 rounded" />
                        <div className="h-4 w-2/3 bg-slate-100 rounded" />
                    </div>

                    {/* Reviews */}
                    <div className="pt-4">
                        <div className="h-5 w-32 bg-slate-100 rounded mb-3" />
                        <div className="space-y-3">
                            {[1, 2].map(i => (
                                <div key={i} className="h-24 bg-slate-100 rounded-xl" />
                            ))}
                        </div>
                    </div>

                    {/* You May Also Like */}
                    <div className="pt-6">
                        <div className="h-5 w-40 bg-slate-100 rounded mb-4" />
                        <div className="flex gap-3 overflow-hidden">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-32 shrink-0 space-y-2">
                                    <div className="aspect-square bg-slate-100 rounded" />
                                    <div className="h-3 w-16 bg-slate-100 rounded" />
                                    <div className="h-3 w-12 bg-slate-100 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
                <div className="max-w-7xl mx-auto px-8 py-8">
                    <div className="grid grid-cols-2 gap-12">
                        {/* Left: Image gallery */}
                        <div>
                            <div className="w-full aspect-[1/0.85] bg-slate-100 rounded-2xl" />
                            <div className="flex gap-2 mt-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={`w-16 h-16 rounded-lg ${i === 1 ? 'bg-slate-200' : 'bg-slate-100'}`} />
                                ))}
                            </div>
                        </div>

                        {/* Right: Product info */}
                        <div className="flex flex-col gap-5">
                            <div className="h-3 w-24 bg-slate-100 rounded" />
                            <div className="h-7 w-3/4 bg-slate-100 rounded" />

                            {/* Rating */}
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-12 bg-slate-100 rounded" />
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="w-3.5 h-3.5 bg-slate-100 rounded" />
                                    ))}
                                </div>
                                <div className="h-4 w-20 bg-slate-100 rounded" />
                            </div>

                            {/* Price */}
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-28 bg-slate-100 rounded" />
                                <div className="h-5 w-20 bg-slate-100 rounded" />
                                <div className="h-6 w-14 bg-slate-100 rounded-full" />
                            </div>

                            {/* Variants */}
                            <div>
                                <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-10 h-10 rounded-full bg-slate-100" />
                                    ))}
                                </div>
                            </div>

                            {/* Quantity + Add to cart */}
                            <div className="flex gap-3">
                                <div className="h-12 w-32 bg-slate-100 rounded-xl" />
                                <div className="h-12 flex-1 bg-slate-100 rounded-xl" />
                            </div>

                            {/* Delivery */}
                            <div className="h-12 w-full bg-slate-100 rounded-xl" />

                            {/* Description */}
                            <div className="space-y-2 pt-2">
                                <div className="h-4 w-full bg-slate-100 rounded" />
                                <div className="h-4 w-5/6 bg-slate-100 rounded" />
                                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
