"use client"

export default function ProductLoading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="w-full aspect-[1/0.85] bg-[#F1F5F9] flex items-center justify-center">
                <span className="font-daciana text-[80px] text-[#CBD5E1]" style={{ lineHeight: 1 }}>M</span>
            </div>
            <div className="px-5 pt-6 space-y-5">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="space-y-2">
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
                <div className="flex gap-2">
                    <div className="h-8 bg-slate-200 rounded w-1/4" />
                    <div className="h-8 bg-slate-200 rounded w-1/6" />
                </div>
                <div className="space-y-3 pt-4">
                    <div className="h-4 bg-slate-200 rounded w-full" />
                    <div className="h-4 bg-slate-200 rounded w-5/6" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                </div>
                <div className="flex gap-3 pt-4">
                    <div className="h-12 bg-slate-200 rounded-xl flex-1" />
                    <div className="h-12 bg-slate-200 rounded-xl w-12" />
                </div>
            </div>
        </div>
    )
}
