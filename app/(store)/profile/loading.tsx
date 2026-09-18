export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            {/* Mobile */}
            <div className="md:hidden px-4 pt-6 pb-20">
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-slate-100" />
                    <div className="space-y-2">
                        <div className="h-5 w-32 bg-slate-100 rounded" />
                        <div className="h-3 w-48 bg-slate-100 rounded" />
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
                    ))}
                </div>

                {/* Nav links */}
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-14 bg-slate-100 rounded-xl" />
                    ))}
                </div>

                {/* Recent orders */}
                <div className="mt-8">
                    <div className="h-5 w-32 bg-slate-100 rounded mb-4" />
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Desktop */}
            <div className="hidden md:block max-w-6xl mx-auto px-8 py-10">
                <div className="flex gap-10">
                    {/* Sidebar */}
                    <div className="w-64 shrink-0 space-y-6">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full bg-slate-100 mb-3" />
                            <div className="h-5 w-32 bg-slate-100 rounded mb-2" />
                            <div className="h-3 w-48 bg-slate-100 rounded" />
                        </div>
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-10 bg-slate-100 rounded-lg" />
                            ))}
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 space-y-8">
                        {/* Stat cards */}
                        <div className="grid grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
                            ))}
                        </div>

                        {/* Loyalty */}
                        <div className="h-32 bg-slate-100 rounded-2xl" />

                        {/* Recent orders */}
                        <div>
                            <div className="h-5 w-32 bg-slate-100 rounded mb-4" />
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 bg-slate-100 rounded-xl" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
