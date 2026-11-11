import { createClient } from "@/utils/supabase/server"
import { Plus, Edit3, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { deleteGiftProduct } from "@/app/actions/gift-products"
import { GiftProductDeleteButton } from "@/components/admin/gift-product-controls"

export default async function AdminGiftProductsPage() {
  const supabase = await createClient()
  let items: any[] = []
  try {
    const res = await supabase.from('gift_products').select('*').order('name', { ascending: true })
    items = res.data || []
  } catch {
    items = []
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-slate-900 text-2xl font-black tracking-tight">Gift Products</h1>
          <p className="text-sm text-slate-500">Freebie inventory — separate from store catalog</p>
        </div>
        <Link href="/admin/gift-products/new" className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2">
          <Plus className="w-4 h-4 stroke-[1.5]" /> New Gift Product
        </Link>
      </div>

      <div className="rounded-2xl border bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
        <table className="w-full">
          <thead className="bg-slate-50/50">
            <tr className="text-xs font-semibold text-slate-600 tracking-normal">
              <th className="py-4 px-6 text-left">Product</th>
              <th className="py-4 px-6 text-left">Brand</th>
              <th className="py-4 px-6 text-left">Price</th>
              <th className="py-4 px-6 text-left">Stock</th>
              <th className="py-4 px-6 text-left">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!items?.length ? (
              <tr><td colSpan={6} className="p-12 text-center text-slate-500 font-medium tabular-nums">No gift products yet.</td></tr>
            ) : (
              items.map((item: any) => {
                const firstImage = item.images?.[0] || null
                return (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6 tabular-nums">
                      <div className="flex items-center gap-3">
                        {firstImage ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-100">
                            <img src={firstImage} className="w-full h-full object-cover" alt={item.name} />
                            {item.images?.length > 1 && (
                              <div className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-xs font-semibold px-1 py-0.5 rounded-tl">
                                +{item.images.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-slate-500 stroke-[1.5]" /></div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{item.name}</div>
                          {item.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 tabular-nums">
                      {item.brand_name ? (
                        <span className="text-xs font-semibold text-slate-700">{item.brand_name}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900 tabular-nums">₹{item.price}</td>
                    <td className="py-4 px-6 tabular-nums"><span className={`font-semibold text-sm ${item.stock <= 0 ? 'text-rose-500' : 'text-slate-900'}`}>{item.stock}</span></td>
                    <td className="py-4 px-6 tabular-nums">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${item.is_active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 tabular-nums">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/gift-products/edit/${item.id}`} className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-500 inline-flex items-center justify-center">
                          <Edit3 className="w-4 h-4 stroke-[1.5]" />
                        </Link>
                        <GiftProductDeleteButton id={item.id} />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
