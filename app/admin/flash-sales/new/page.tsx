import { createClient } from "@/utils/supabase/server"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { FlashSaleForm } from "../flash-sale-form"

export default async function NewFlashSalePage() {
  const supabase = await createClient()
  const { data: categories } = await supabase.from('categories').select('id, name').order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/flash-sales" className="rounded-xl h-10 w-10 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">New Flash Sale</h1>
          <p className="text-sm text-slate-500">Schedule a time-limited discount</p>
        </div>
      </div>
      <FlashSaleForm categories={categories || []} />
    </div>
  )
}
