"use client"

import * as React from "react"
import { Skeleton } from "boneyard-js/react"

export default function Loading() {
    return (
        <Skeleton name="homepage" loading={true}>
            <div className="bg-white pb-20 animate-pulse">
                {/* HERO */}
                <div className="w-full h-[540px] bg-slate-100" />
                
                {/* CONTENT */}
                <div className="px-6 py-8 space-y-10">
                    <div className="h-4 w-1/3 bg-slate-100 rounded" />
                    <div className="flex gap-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="w-16 h-16 rounded-full bg-slate-100" />)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-slate-100 rounded-2xl" />)}
                    </div>
                </div>
            </div>
        </Skeleton>
    )
}
