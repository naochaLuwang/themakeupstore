export default function AdminLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-64 bg-slate-100 rounded-lg" />
                </div>
                <div className="h-11 w-32 bg-slate-200 rounded-xl" />
            </div>
            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-slate-100 rounded-lg" />
                            <div className="flex-1 h-4 bg-slate-100 rounded" />
                            <div className="h-4 w-24 bg-slate-100 rounded" />
                            <div className="h-9 w-9 bg-slate-100 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
