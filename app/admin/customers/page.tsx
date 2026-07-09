import { createClient } from "@/utils/supabase/server"
import { CustomerTable } from "@/components/admin/customers/customer-table"
import { CustomerFilters } from "@/components/admin/customers/customer-filters"
import { Users, UserCheck } from "lucide-react"
import { requireAdmin } from "@/lib/admin"

export default async function CustomersPage({
    searchParams
}: {
    searchParams: Promise<{ q?: string; page?: string; from?: string; to?: string }>
}) {
    await requireAdmin()
    const { q, from, to } = await searchParams
    const supabase = await createClient()

    let query = supabase
        .from("profiles")
        .select(`
            *,
            orders (
                id,
                total,
                created_at
            )
        `, { count: 'exact' })

    if (q) {
        query = query.ilike("full_name", `%${q}%`)
    }
    if (from) {
        query = query.gte("created_at", `${from}T00:00:00`)
    }
    if (to) {
        query = query.lte("created_at", `${to}T23:59:59`)
    }

    const { data: customers, count } = await query
        .order("created_at", { ascending: false })

    const totalCustomers = count || 0
    const activeThisMonth = customers?.filter(c =>
        c.orders.some((o: any) => new Date(o.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    ).length || 0

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Customers</h1>
                    <p className="text-sm text-slate-500">Manage your relationship with your shoppers.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Customers</p>
                        <Users className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{totalCustomers}</div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active (30d)</p>
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{activeThisMonth}</div>
                </div>
            </div>

            <div className="rounded-2xl border bg-white shadow-sm">
                <div className="p-4 border-b border-slate-100">
                    <CustomerFilters />
                </div>
                <div className="p-4">
                    <CustomerTable customers={customers || []} />
                </div>
            </div>
        </div>
    )
}