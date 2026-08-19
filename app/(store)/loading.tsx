"use client"

import { Skeleton } from "boneyard-js/react"
import { StoreSkeleton } from "@/components/store/store-skeleton"

export default function RootStoreLoading() {
    return (
        <Skeleton name="store-home" loading={true} fallback={<StoreSkeleton />}>
            <StoreSkeleton />
        </Skeleton>
    )
}