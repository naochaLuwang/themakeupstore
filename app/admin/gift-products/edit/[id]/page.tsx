import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { GiftProductForm } from "../../gift-product-form"
import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"

export default async function EditGiftProductPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data } = await supabase.from('gift_products').select('*').eq('id', id).single()
  if (!data) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/gift-products" className="rounded-xl h-10 w-10 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-500 inline-flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-slate-900 text-2xl font-black tracking-tight">Edit Gift Product</h1>
          <p className="text-sm text-slate-500">{data.name}</p>
        </div>
      </div>
      <GiftProductForm initialData={data} isEdit />
    </div>
  )
}
