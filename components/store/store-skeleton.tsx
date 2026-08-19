"use client"

export function StoreSkeleton() {
    return (
        <div className="min-h-[100dvh] bg-white">
            {/* Hero shimmer */}
            <div className="relative w-full h-[540px] bg-slate-100 overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{
                        background: "linear-gradient(100deg, #f1f5f9 40%, #e2e8f0 50%, #f1f5f9 60%)",
                        backgroundSize: "200% 100%",
                        animation: "storeShimmer 1.6s ease-in-out infinite",
                    }}
                />
                <div className="absolute bottom-14 left-6 right-6 space-y-3">
                    <div className="h-6 w-32 rounded-full bg-slate-200/60 animate-pulse" />
                    <div className="h-3 w-44 rounded-full bg-slate-200/60 animate-pulse" />
                    <div className="h-10 w-64 rounded-lg bg-slate-200/60 animate-pulse" />
                </div>
            </div>

            {/* Shipping banner */}
            <div className="py-4 px-6 flex justify-center">
                <div className="h-4 w-72 rounded-full bg-slate-100 animate-pulse" />
            </div>

            {/* Value props */}
            <div className="flex py-4 px-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-[18px] h-[18px] rounded-full bg-slate-100 animate-pulse" />
                        <div className="h-2.5 w-16 rounded-full bg-slate-100 animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Brand circles */}
            <div className="px-6 mb-4 space-y-2">
                <div className="h-3 w-16 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-6 w-36 rounded-lg bg-slate-100 animate-pulse" />
            </div>
            <div className="flex gap-4 pl-6 pr-4 overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 w-[76px] shrink-0">
                        <div className="w-[76px] h-[76px] rounded-full bg-slate-100 animate-pulse" />
                        <div className="h-2 w-14 rounded-full bg-slate-100 animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Product grid */}
            <div className="mt-8 px-6 mb-4 space-y-2">
                <div className="h-3 w-24 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-6 w-44 rounded-lg bg-slate-100 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4 px-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-2.5 w-3/4 rounded-full bg-slate-100 animate-pulse" />
                        <div className="h-2 w-1/2 rounded-full bg-slate-100 animate-pulse" />
                        <div className="h-4 w-16 rounded-md bg-slate-100 animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Category grid */}
            <div className="px-4 mt-8 space-y-4">
                <div className="h-6 w-56 rounded-lg bg-slate-100 animate-pulse" />
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes storeShimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    )
}