import { createClient } from "@/utils/supabase/server"
import { Plus, Edit3, Trash2, Gift } from "lucide-react"
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
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Gift Products</h1>
          <p className="text-sm text-slate-500">Freebie inventory — separate from store catalog</p>
        </div>
        <Link href="/admin/gift-products/new" className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Gift Product
        </Link>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50/50">
            <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-4 px-6 text-left">Product</th>
              <th className="py-4 px-6 text-left">Price</th>
              <th className="py-4 px-6 text-left">Stock</th>
              <th className="py-4 px-6 text-left">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!items?.length ? (
              <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium">No gift products yet.</td></tr>
            ) : (
              items.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-all">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {item.image_url ? (
                        <img src={item.image_url} className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Gift className="w-4 h-4 text-slate-400" /></div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{item.name}</div>
                        {item.description && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900">₹{item.price}</td>
                  <td className="py-4 px-6"><span className={`font-bold text-sm ${item.stock <= 0 ? 'text-rose-500' : 'text-slate-900'}`}>{item.stock}</span></td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[8px] font-black ${item.is_active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/gift-products/edit/${item.id}`} className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      <GiftProductDeleteButton id={item.id} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
