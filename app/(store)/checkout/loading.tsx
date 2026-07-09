import { Skeleton } from "@/components/ui/skeleton"

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="bg-white rounded-2xl p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
            <div className="bg-white rounded-2xl p-6 space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 space-y-4 sticky top-24">
              <Skeleton className="h-6 w-24" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
