"use client"

import { Skeleton } from "boneyard-js/react"

function CheckoutSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
                        <div className="bg-white rounded-2xl p-6 space-y-4">
                            <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
                            <div className="h-12 w-full bg-slate-100 rounded animate-pulse" />
                            <div className="h-12 w-full bg-slate-100 rounded animate-pulse" />
                            <div className="h-12 w-3/4 bg-slate-100 rounded animate-pulse" />
                        </div>
                        <div className="bg-white rounded-2xl p-6 space-y-4">
                            <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
                            <div className="h-20 w-full bg-slate-100 rounded animate-pulse" />
                            <div className="h-20 w-full bg-slate-100 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl p-6 space-y-4 sticky top-24">
                            <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="h-16 w-16 rounded-lg bg-slate-100 animate-pulse" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                                            <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-4 space-y-2">
                                <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                                <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                                <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                            </div>
                            <div className="h-12 w-full bg-slate-100 rounded-xl animate-pulse" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default function CheckoutLoading() {
    return (
        <Skeleton name="checkout" loading={true} fallback={<CheckoutSkeleton />}>
            <CheckoutSkeleton />
        </Skeleton>
    )
}