import { Skeleton } from "@/components/ui/skeleton"

export default function ExclusiveLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-16 text-center flex flex-col items-center">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-12 md:h-16 w-64 md:w-96 mb-4" />
        </div>
      </div>
      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-4 w-32" />
          <div className="h-[1px] flex-1 bg-slate-200 mx-6 hidden md:block" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
