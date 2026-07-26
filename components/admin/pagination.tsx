"use client"

import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

function PaginationInner({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const createPageUrl = (pageNumber: number) => {
        const params = new URLSearchParams(searchParams)
        params.set("page", pageNumber.toString())
        return `?${params.toString()}`
    }

    return (
        <div className="flex items-center justify-center space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(createPageUrl(currentPage - 1))}
                disabled={currentPage <= 1}
            >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>

            <div className="text-sm font-medium">
                Page {currentPage} of {totalPages}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(createPageUrl(currentPage + 1))}
                disabled={currentPage >= totalPages}
            >
                Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
        </div>
    )
}

export function Pagination(props: { currentPage: number; totalPages: number }) {
    return (
        <Suspense fallback={<div className="h-9 w-48 bg-slate-100 rounded-lg animate-pulse mx-auto" />}>
            <PaginationInner {...props} />
        </Suspense>
    )
}