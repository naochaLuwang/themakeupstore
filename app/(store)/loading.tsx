"use client"

export default function Loading() {
    return (
        <div className="bg-white pb-20 animate-pulse">
            {/* HERO */}
            <div className="w-full h-[540px] bg-slate-100" />

            {/* SHIPPING BANNER */}
            <div className="bg-slate-50 py-3">
                <div className="h-3 w-64 bg-slate-100 rounded mx-auto" />
            </div>

            {/* OUR BRANDS */}
            <div className="pt-8">
                <div className="flex items-end justify-between px-4 mb-5">
                    <div>
                        <div className="h-2.5 w-20 bg-slate-100 rounded mb-1" />
                        <div className="h-6 w-32 bg-slate-100 rounded" />
                    </div>
                    <div className="h-3.5 w-16 bg-slate-100 rounded" />
                </div>
                <div className="flex gap-4 overflow-hidden pl-6 pr-4">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                            <div className="w-[76px] h-[76px] rounded-full bg-slate-100" />
                            <div className="h-2 w-12 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* SHOP BY CATEGORY */}
            <div className="px-4 mb-10 pt-8">
                <div className="h-7 w-56 bg-slate-100 rounded mb-4" />
                <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="aspect-[4/5] bg-slate-100 rounded-2xl" />
                    ))}
                </div>
            </div>

            {/* NEW ARRIVALS */}
            <div className="mb-10">
                <div className="flex items-end justify-between px-4 mb-5">
                    <div>
                        <div className="h-2.5 w-28 bg-slate-100 rounded mb-1" />
                        <div className="h-6 w-28 bg-slate-100 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="p-2 space-y-2">
                            <div className="aspect-square bg-slate-100 rounded-xl" />
                            <div className="h-2.5 w-16 bg-slate-100 rounded" />
                            <div className="h-3.5 w-full bg-slate-100 rounded" />
                            <div className="h-3 w-12 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* FUN SIZE */}
            <div className="mb-5">
                <div className="flex items-end justify-between px-4 mb-5">
                    <div>
                        <div className="h-2.5 w-24 bg-slate-100 rounded mb-1" />
                        <div className="h-6 w-28 bg-slate-100 rounded" />
                    </div>
                </div>
                <div className="flex gap-3 overflow-hidden px-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-36 shrink-0 space-y-2">
                            <div className="aspect-square bg-slate-100 rounded-xl" />
                            <div className="h-2.5 w-14 bg-slate-100 rounded" />
                            <div className="h-3 w-full bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* KIKO MILANO */}
            <div className="mb-10">
                <div className="flex items-end justify-between px-4 mb-5">
                    <div>
                        <div className="h-2.5 w-28 bg-slate-100 rounded mb-1" />
                        <div className="h-6 w-36 bg-slate-100 rounded" />
                    </div>
                </div>
                <div className="flex gap-3 overflow-hidden px-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-36 shrink-0 space-y-2">
                            <div className="aspect-square bg-slate-100 rounded-xl" />
                            <div className="h-2.5 w-14 bg-slate-100 rounded" />
                            <div className="h-3 w-full bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* FOOTER */}
            <div className="pt-6 px-4 flex flex-col items-center">
                <div className="h-11 w-40 bg-slate-100 rounded mb-6" />
                <div className="w-10 h-px bg-slate-100 mb-4" />
                <div className="flex justify-evenly w-full">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-[72px] h-[72px] rounded-full bg-slate-100" />
                            <div className="h-2 w-14 bg-slate-100 rounded" />
                            <div className="h-2 w-10 bg-slate-100 rounded" />
                            <div className="h-2 w-16 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
