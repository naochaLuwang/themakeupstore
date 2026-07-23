import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { GiftProductForm } from "../gift-product-form"

export default function NewGiftProductPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/gift-products" className="rounded-xl h-10 w-10 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">New Gift Product</h1>
          <p className="text-sm text-slate-500">Add a freebie item to your gift inventory</p>
        </div>
      </div>
      <GiftProductForm />
    </div>
  )
}
