"use client"

import { Skeleton } from "boneyard-js/react"

function PageSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-16 text-center flex flex-col items-center">
                    <div className="h-3 w-24 mb-3 bg-slate-100 rounded animate-pulse" />
                    <div className="h-12 md:h-16 w-64 md:w-96 mb-4 bg-slate-100 rounded animate-pulse" />
                </div>
            </div>
            <main className="container mx-auto px-4 py-12">
                <div className="flex justify-between items-center mb-8">
                    <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                    <div className="h-[1px] flex-1 bg-slate-200 mx-6 hidden md:block" />
                    <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="space-y-4">
                            <div className="aspect-[4/5] w-full rounded-2xl bg-slate-100 animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                                <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                                <div className="h-4 w-1/4 bg-slate-100 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}

export default function CategoryLoading() {
    return (
        <Skeleton name="category-page" loading={true} fallback={<PageSkeleton />}>
            <PageSkeleton />
        </Skeleton>
    )
}