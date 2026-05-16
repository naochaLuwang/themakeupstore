import { createClient } from "@/utils/supabase/server"
import { CustomerTable } from "@/components/admin/customers/customer-table"
import { CustomerFilters } from "@/components/admin/customers/customer-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, UserCheck } from "lucide-react"

export default async function CustomersPage({
    searchParams
}: {
    searchParams: Promise<{ q?: string; page?: string }>
}) {
    const { q, page } = await searchParams
    const supabase = await createClient()

    const itemsPerPage = 10
    const currentPage = Number(page) || 1
    const fromRange = (currentPage - 1) * itemsPerPage
    const toRange = fromRange + itemsPerPage - 1

    // Fetch profiles with a count of their orders and sum of total spend
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

    const { data: customers, count } = await query
        .order("created_at", { ascending: false })
        .range(fromRange, toRange)

    const totalCustomers = count || 0
    const activeThisMonth = customers?.filter(c =>
        c.orders.some((o: any) => new Date(o.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    ).length || 0

    const totalPages = Math.ceil((count || 0) / itemsPerPage)

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                    <p className="text-muted-foreground text-sm">Manage your relationship with your shoppers.</p>
                </div>
            </div>

            {/* QUICK METRICS */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{totalCustomers}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active (30d)</CardTitle>
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{activeThisMonth}</div></CardContent>
                </Card>
            </div >

            <Card>
                <CardHeader>
                    <CustomerFilters />
                </CardHeader>
                <CardContent>
                    <CustomerTable customers={customers || []} />
                </CardContent>
            </Card>
        </div>
    )
}