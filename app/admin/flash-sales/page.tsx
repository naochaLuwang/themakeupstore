import { createClient } from "@/utils/supabase/server"
import { Plus, Edit3, Zap } from "lucide-react"
import Link from "next/link"
import { FlashSaleStatusToggle, DeleteFlashSaleButton } from "@/components/admin/flash-sale-controls"

export default async function AdminFlashSalesPage() {
  const supabase = await createClient()
  
  // Fetch flash sales first
  const { data: sales, error: salesError } = await supabase
    .from('flash_sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  
  if (salesError) throw new Error(salesError.message)

  // Fetch related product and category data separately
  const productIds = sales?.filter(s => s.scope === 'product' && s.product_id).map(s => s.product_id) || []
  const categoryIds = sales?.filter(s => s.scope === 'category' && s.category_id).map(s => s.category_id) || []
  
  const [productsRes, categoriesRes] = await Promise.all([
    productIds.length > 0 
      ? supabase.from('products').select('id, name, thumbnail_url').in('id', productIds)
      : { data: [], error: null },
    categoryIds.length > 0
      ? supabase.from('categories').select('id, name').in('id', categoryIds)
      : { data: [], error: null }
  ])

  const productMap = new Map((productsRes.data || []).map(p => [p.id, p]))
  const categoryMap = new Map((categoriesRes.data || []).map(c => [c.id, c]))

  const now = new Date()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Flash Sales</h1>
          <p className="text-sm text-slate-500">Time-limited discounts that auto-revert</p>
        </div>
        <Link href="/admin/flash-sales/new" className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Flash Sale
        </Link>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50/50">
            <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-4 px-6 text-left">Target</th>
              <th className="py-4 px-6 text-left">Discount</th>
              <th className="py-4 px-6 text-left">Schedule</th>
              <th className="py-4 px-6 text-left">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!sales?.length ? (
              <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium">No flash sales yet.</td></tr>
            ) : (
              sales.map((sale: any) => {
                const start = new Date(sale.starts_at)
                const end = new Date(sale.ends_at)
                const isLive = sale.is_active && now >= start && now <= end
                const isScheduled = sale.is_active && now < start
                const isExpired = now > end
                
                const product = sale.scope === 'product' && sale.product_id ? productMap.get(sale.product_id) : null
                const category = sale.scope === 'category' && sale.category_id ? categoryMap.get(sale.category_id) : null

                return (
                  <tr key={sale.id} className="hover:bg-slate-50/30 transition-all">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {sale.scope === 'product' && product?.thumbnail_url ? (
                          <img src={product.thumbnail_url} className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Zap className="w-4 h-4 text-slate-400" /></div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {sale.scope === 'product' ? product?.name || 'Unknown Product' :
                             sale.scope === 'category' ? `Category: ${category?.name || 'Unknown'}` :
                             sale.scope === 'brand' ? `Brand: ${sale.brand}` :
                             'All Products'}
                          </div>
                          {sale.label && <div className="text-xs text-slate-400 mt-0.5">{sale.label}</div>}
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{sale.scope}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {sale.discount_type === 'percentage' ? `${sale.discount_value}%` : `₹${sale.discount_value}`}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      <div className="text-slate-600 font-medium">
                        {start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-slate-400 text-xs">
                        → {end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] font-bold mt-1 uppercase tracking-wider"
                        style={{ color: isLive ? '#059669' : isScheduled ? '#d97706' : isExpired ? '#94a3b8' : '#0f172a' }}
                      >
                        {isLive ? '● LIVE' : isScheduled ? '○ Scheduled' : isExpired ? '○ Expired' : sale.is_active ? '○ Active' : '○ Disabled'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <FlashSaleStatusToggle id={sale.id} isActive={sale.is_active} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/flash-sales/edit/${sale.id}`} className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <DeleteFlashSaleButton id={sale.id} />
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