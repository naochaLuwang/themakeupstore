import { createClient } from "@/utils/supabase/server"
import { DateRangePicker } from "@/components/admin/date-range-picker"
import { RecentOrdersTable } from "@/components/admin/recent-orders-table"
import { Suspense } from "react"
import dynamic from "next/dynamic"
import {
    Loader2, TrendingUp, AlertCircle, CheckCircle2,
    PackagePlus, Send, Tag, MessageSquare, UserPlus, BarChart3,
    ShoppingBag, Clock, ArrowUpRight, Box, ShoppingCart,
    Users, CircleDollarSign, Activity, Sparkles, Zap, Bell,
    ArrowUp, ArrowDown, DollarSign, Hourglass, Layers, Globe,
    Eye, CreditCard, RefreshCw, Target, Percent, Flame, CalendarDays,
    Phone, Mail, User, Wallet, Banknote, BadgePercent
} from "lucide-react"
import { format, startOfDay, endOfDay, subDays, parseISO, differenceInDays, getDay } from "date-fns"
import Link from "next/link"

const RevenueChart = dynamic(() => import("@/components/admin/revenue-chart").then(m => ({ default: m.RevenueChart })), {
    loading: () => <div className="rounded-2xl border bg-white p-6 shadow-sm h-80 flex items-center justify-center"><Loader2 className="w-6 h-6 text-slate-300 animate-spin" /></div>,
})
import { Badge } from "@/components/ui/badge"

// ─── Stat Card (compact) ───

function StatCard({ label, value, subtitle, icon, change, className = "" }: {
    label: string; value: string; subtitle?: string; icon: React.ReactNode; change?: number; className?: string
}) {
    return (
        <div className={`rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-sm ${className}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
                <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-md bg-slate-50 border border-slate-100 shrink-0 ml-1">
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500">{icon}</div>
                </div>
            </div>
            <div className="flex items-end justify-between gap-1">
                <p className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">{value}</p>
                {change !== undefined && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.5 rounded ${
                        change >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
                    }`}>
                        {change >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {Math.abs(change).toFixed(0)}%
                    </span>
                )}
            </div>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
    )
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
}

function SectionTitle({ icon, label, right }: { icon: React.ReactNode; label: string; right?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
                <span className="text-slate-400">{icon}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            {right}
        </div>
    )
}

// ─── Day of week chart (inline, compact) ───

function DayOfWeekChart({ orders }: { orders: any[] }) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const buckets = days.map(() => ({ total: 0, count: 0 }))
    orders.forEach((o: any) => {
        const d = getDay(new Date(o.created_at))
        buckets[d].total += Number(o.total || 0)
        buckets[d].count++
    })
    const maxR = Math.max(...buckets.map(b => b.total), 1)
    return (
        <div className="flex items-end gap-1.5 h-20 mt-1">
            {buckets.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-semibold text-emerald-600 tabular-nums">₹{Math.round(b.total / 1000)}k</span>
                    <div className="w-full rounded-t-sm bg-emerald-400/30" style={{ height: `${(b.total / maxR) * 100}%` }} />
                    <span className="text-[9px] text-slate-500 font-semibold">{days[i]}</span>
                </div>
            ))}
        </div>
    )
}

// ─── Progress bar mini ───

function MiniPct({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0
    return (
        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
    )
}

// ─── Page ───

export default async function AdminDashboard({ searchParams }: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    const { from, to } = await searchParams
    const supabase = await createClient()

    const now = new Date()
    const end = to ? endOfDay(parseISO(to)) : endOfDay(now)
    const start = from ? startOfDay(parseISO(from)) : startOfDay(subDays(now, 30))
    const periodDays = differenceInDays(end, start) || 1
    const priorStart = subDays(start, periodDays)
    const priorEnd = subDays(start, 1)

    const toIso = (d: Date) => d.toISOString()
    const [startDate, endDate, pStart, pEnd, todayStart, todayEnd] = [
        toIso(start), toIso(end), toIso(priorStart), toIso(priorEnd),
        toIso(startOfDay(now)), toIso(endOfDay(now)),
    ]

    let ordersRes: any, priorRes: any, todayRes: any, msgsRes: any, wlRes: any, invRes: any, refundRes: any,
        trafficRes: any, catRes: any, newCustRes: any
    try {
        [ordersRes, priorRes, todayRes, msgsRes, wlRes, invRes, refundRes,
            trafficRes, catRes, newCustRes] = await Promise.all([
            supabase.from("orders").select(`id,total,status,payment_status,payment_method,promo_code,created_at,user_id,
                order_items(quantity,product_name,product_id,unit_price),profiles!orders_user_id_fkey(full_name)`)
                .gte("created_at", startDate).lte("created_at", endDate).order("created_at", { ascending: false }),
            supabase.from("orders").select("id,total,status,payment_status,created_at")
                .gte("created_at", pStart).lte("created_at", pEnd),
            supabase.from("orders").select("id,total,status,created_at", { count: "exact" })
                .gte("created_at", todayStart).lte("created_at", todayEnd),
            supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "unread"),
            supabase.from("wholesale_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("product_variants").select("id,stock"),
            supabase.from("orders").select("id", { count: "exact" }).eq("payment_status", "refunded")
                .gte("created_at", startDate).lte("created_at", endDate),
            supabase.from("traffic_log").select("id", { count: "exact", head: true }).gte("created_at", toIso(subDays(now, 1))),
            supabase.from("product_categories").select("product_id,categories!inner(name)"),
            supabase.from("orders").select("user_id")
                .lt("created_at", startDate).not("user_id", "is", null),
        ])
    } catch {
        ordersRes = { data: [], count: 0 }
        priorRes = { data: [] }
        todayRes = { data: [], count: 0 }
        msgsRes = { count: 0 }
        wlRes = { count: 0 }
        invRes = { data: [] }
        refundRes = { count: 0 }
        trafficRes = { count: 0 }
        catRes = { data: [] }
        newCustRes = { data: [] }
    }

    // ── Derived ──
    const orders = ordersRes.data || []
    const net = orders.filter((o: any) => o.status !== 'cancelled')
    const prior = (priorRes.data || []).filter((o: any) => o.status !== 'cancelled')
    const todayNet = (todayRes.data || []).filter((o: any) => o.status !== 'cancelled')
    const todayRev = todayNet.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
    const todayCnt = todayNet.length

    // Get contact messages and wholesale for activity (not just count)
    const msgsData = await supabase.from("contact_messages")
        .select("id,name,subject,created_at,status").order("created_at", { ascending: false }).limit(3)
    const wlData = await supabase.from("wholesale_applications")
        .select("id,company_name,created_at,status").order("created_at", { ascending: false }).limit(3)

    const recentMsgs = msgsData.data || []
    const recentWl = wlData.data || []

    const sumR = (o: any[]) => o.reduce((s: number, x: any) => s + Number(x.total || 0), 0)
    const calc = (o: any[]) => ({
        rev: sumR(o), cnt: o.length,
        del: o.filter((x: any) => x.status === 'delivered').length,
        full: o.length > 0 ? (o.filter((x: any) => x.status === 'delivered').length / o.length) * 100 : 0,
        cust: new Set(o.map((x: any) => x.user_id).filter(Boolean)).size,
        pend: o.filter((x: any) => x.status === 'pending' || x.status === 'packed').length,
        aov: o.length > 0 ? Math.round(sumR(o) / o.length) : 0,
    })
    const c = calc(net), p = calc(prior)
    const pct = (c: number, p: number) => p > 0 ? ((c - p) / p) * 100 : c > 0 ? 100 : 0

    const totalVar = invRes.data?.length || 0
    const inStock = (invRes.data || []).filter((v: any) => v.stock > 0).length
    const refundCount = refundRes.count || 0
    const returnRate = c.cnt > 0 ? (refundCount / c.cnt) * 100 : 0
    const promoOrders = net.filter((o: any) => o.promo_code).length
    const promoRate = c.cnt > 0 ? (promoOrders / c.cnt) * 100 : 0
    const unreadMsg = msgsRes.count || 0
    const pendingWl = wlRes.count || 0
    const traffic24h = trafficRes.count || 0
    const conversion = traffic24h > 0 ? ((todayCnt / traffic24h) * 100) : 0

    // New vs returning customers
    const returningIds = new Set((newCustRes.data || []).map((r: any) => r.user_id).filter(Boolean))
    const orderUserIds = net.map((o: any) => o.user_id).filter(Boolean)
    const totalCustomers = new Set(orderUserIds).size
    const returning = orderUserIds.filter((id: any) => returningIds.has(id)).length
    const isUnique = new Set()
    const returningUnique = orderUserIds.filter((id: any) => {
        if (isUnique.has(id)) return false
        isUnique.add(id)
        return returningIds.has(id)
    }).length
    const returningCount = returningUnique
    const newCount = totalCustomers - returningCount

    // Payment methods
    const pmBuckets = new Map<string, number>()
    net.forEach((o: any) => {
        const pm = o.payment_method || "COD"
        pmBuckets.set(pm, (pmBuckets.get(pm) || 0) + 1)
    })
    const pmTotal = [...pmBuckets.values()].reduce((a, b) => a + b, 0)

    // Categories
    const prodCatMap = new Map<string, string>()
    catRes.data?.forEach((pc: any) => {
        if (!prodCatMap.has(pc.product_id)) prodCatMap.set(pc.product_id, pc.categories?.name || "Uncategorized")
    })
    const catItems = new Map<string, number>()
    net.forEach((o: any) => {
        o.order_items?.forEach((oi: any) => {
            const cat = prodCatMap.get(oi.product_id) || "Uncategorized"
            catItems.set(cat, (catItems.get(cat) || 0) + (oi.quantity || 1))
        })
    })
    const topCats = [...catItems.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Top products (from order_items)
    const prodMap = new Map<string, { name: string; category: string; qty: number; rev: number }>()
    net.forEach((o: any) => {
        o.order_items?.forEach((oi: any) => {
            const key = oi.product_name || "Unknown"
            const cat = prodCatMap.get(oi.product_id) || "Uncategorized"
            const e = prodMap.get(key) || { name: key, category: cat, qty: 0, rev: 0 }
            e.qty += oi.quantity || 1
            e.rev += (oi.quantity || 1) * Number(oi.unit_price || 0)
            prodMap.set(key, e)
        })
    })
    const topProds = [...prodMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)

    // Status breakdown
    const statusBD = [
        { label: "Pending", cnt: orders.filter((o: any) => o.status === 'pending').length, color: "text-amber-600", bg: "bg-amber-400" },
        { label: "Packed", cnt: orders.filter((o: any) => o.status === 'packed').length, color: "text-blue-600", bg: "bg-blue-400" },
        { label: "Shipped", cnt: orders.filter((o: any) => o.status === 'shipped').length, color: "text-purple-600", bg: "bg-purple-400" },
        { label: "Delivered", cnt: orders.filter((o: any) => o.status === 'delivered').length, color: "text-emerald-600", bg: "bg-emerald-400" },
        { label: "Cancelled", cnt: orders.filter((o: any) => o.status === 'cancelled').length, color: "text-red-600", bg: "bg-red-400" },
    ]

    // PM colors
    const pmColors: Record<string, string> = {
        "COD": "bg-amber-400",
        "razorpay": "bg-blue-400",
        "stripe": "bg-indigo-400",
        "prepaid": "bg-emerald-400",
        "card": "bg-violet-400",
        "upi": "bg-cyan-400",
        "paypal": "bg-sky-400",
    }

    return (
        <div className="space-y-2 sm:space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <h1 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight truncate">Dashboard</h1>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{format(start, "MMM dd, yyyy")} — {format(end, "MMM dd, yyyy")}</p>
                </div>
                <div className="shrink-0">
                    <DateRangePicker />
                </div>
            </div>

            {ordersRes.error && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs font-medium text-red-700">Failed to load dashboard data.</p>
                </div>
            )}

            {/* Row 1: Real-time / Today metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                <StatCard label="Today Revenue" value={`₹${todayRev.toLocaleString('en-IN')}`} icon={<TrendingUp />} />
                <StatCard label="Today Orders" value={todayCnt.toString()} icon={<ShoppingCart />} />
                <StatCard label="Fulfillment" value={`${c.full.toFixed(0)}%`} subtitle={`${c.del} delivered`} icon={<CheckCircle2 />}
                    change={pct(c.full, p.full)} />
                <StatCard label="Conversion" value={`${conversion.toFixed(1)}%`} subtitle="Last 24h" icon={<Target />} />
                <StatCard label="Refund Rate" value={`${returnRate.toFixed(1)}%`} subtitle={`${refundCount} refunded`}
                    icon={<RefreshCw />} change={returnRate > 5 ? -100 : 100} />
                <StatCard label="Visitors 24h" value={traffic24h.toLocaleString()} icon={<Eye />} />
            </div>

            {/* Row 2: Period stats with comparison */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                <StatCard label="Revenue" value={`₹${(c.rev / 1000).toFixed(1)}K`} subtitle={`${c.cnt} orders`}
                    icon={<CircleDollarSign />} change={pct(c.rev, p.rev)} />
                <StatCard label="Avg Order" value={`₹${c.aov.toLocaleString()}`} icon={<BarChart3 />} change={pct(c.aov, p.aov)} />
                <StatCard label="Customers" value={c.cust.toString()} icon={<Users />} change={pct(c.cust, p.cust)} />
                <StatCard label="Pending" value={c.pend.toString()} icon={<Hourglass />} change={pct(c.pend, p.pend)} />
                <StatCard label="Stock Health"
                    value={`${totalVar > 0 ? Math.round((inStock / totalVar) * 100) : 0}%`}
                    subtitle={`${inStock}/${totalVar}`} icon={<Box />} />
            </div>

            {/* Quick Actions */}
            <SectionCard className="p-2 sm:p-2.5">
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
                    {[
                        { label: "New Product", href: "/admin/products/add", icon: PackagePlus },
                        { label: "Broadcast", href: "/admin/broadcast", icon: Send },
                        { label: "Promos", href: "/admin/promos", icon: Tag },
                        { label: "Messages", href: "/admin/messages", icon: MessageSquare },
                        { label: "Stock", href: "/admin/stock", icon: Box },
                        { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
                        { label: "Customers", href: "/admin/customers", icon: Users },
                        { label: "Reports", href: "/admin/reports/sales", icon: BarChart3 },
                    ].map(a => (
                        <Link key={a.label} href={a.href}
                            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:-translate-y-0.5 transition-all shrink-0"
                        >
                            <a.icon className="w-3 h-3 text-slate-500" />
                            <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 whitespace-nowrap">{a.label}</span>
                            <ArrowUpRight className="w-2.5 h-2.5 text-slate-300 hidden sm:block" />
                        </Link>
                    ))}
                </div>
            </SectionCard>

            {/* Row 3: Charts area */}
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 sm:gap-3">
                <SectionCard className="p-3 sm:p-4 sm:col-span-3">
                    <SectionTitle icon={<Activity />} label="Revenue Flow" />
                    <RevenueChart orders={net} startDate={startDate} endDate={endDate} />
                </SectionCard>
                <SectionCard className="p-3 sm:p-4 sm:col-span-2">
                    <SectionTitle icon={<Flame />} label="Top Products" />
                    {topProds.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-6">No data</p>
                    ) : (
                        <div className="space-y-1.5">
                            {topProds.map((p, i) => (
                                <div key={p.name} className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-300 w-4">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-700 truncate font-medium">{p.name}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{p.category}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">{p.qty}</span>
                                    <div className="hidden sm:block w-12"><MiniPct value={p.qty} max={topProds[0].qty} color="bg-blue-400" /></div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
                <SectionCard className="p-3 sm:p-4 sm:col-span-1">
                    <SectionTitle icon={<Layers />} label="Orders" />
                    <div className="space-y-1.5">
                        {statusBD.map(s => (
                            <div key={s.label} className="flex items-center justify-between gap-1">
                                <span className={`text-[10px] ${s.color}`}>{s.label}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-slate-700">{s.cnt}</span>
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.bg}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 mb-2">
                        <CalendarDays className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Day of Week</span>
                    </div>
                    <DayOfWeekChart orders={net} />
                </SectionCard>
            </div>

            {/* Row 4: Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 sm:gap-3">
                <SectionCard className="sm:col-span-3 overflow-hidden">
                    <div className="p-3 pb-0">
                        <SectionTitle icon={<ShoppingBag />} label="Recent Orders"
                            right={<Link href="/admin/orders" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">View All →</Link>} />
                    </div>
                    <RecentOrdersTable orders={orders.slice(0, 8)} />
                </SectionCard>
                <SectionCard className="p-3 sm:p-4 sm:col-span-2">
                    <SectionTitle icon={<BarChart3 />} label="Top Categories" />
                    {topCats.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-6">No data</p>
                    ) : (
                        <div className="space-y-2">
                            {topCats.map(([cat, cnt]) => (
                                <div key={cat} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600 flex-1 truncate">{cat}</span>
                                    <span className="text-xs font-semibold text-slate-500">{cnt}</span>
                                    <MiniPct value={cnt} max={topCats[0][1]} color="bg-violet-400" />
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
                <SectionCard className="p-3 sm:p-4 sm:col-span-1">
                    <SectionTitle icon={<CreditCard />} label="Payment" />
                    {pmBuckets.size === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-6">No data</p>
                    ) : (
                        <div className="space-y-1.5">
                            {[...pmBuckets.entries()].sort((a, b) => b[1] - a[1]).map(([pm, cnt]) => (
                                <div key={pm}>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[10px] text-slate-500 font-medium">{pm}</span>
                                        <span className="text-xs font-semibold text-slate-700">{pmTotal > 0 ? Math.round((cnt / pmTotal) * 100) : 0}%</span>
                                    </div>
                                    <MiniPct value={cnt} max={pmTotal} color={pmColors[pm] || "bg-slate-400"} />
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* Row 5: Activity + Low Stock + Bottom Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <SectionCard className="p-3 sm:p-4">
                    <SectionTitle icon={<Bell />} label="Recent Activity"
                        right={<Link href="/admin/messages" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">View</Link>} />
                    {recentMsgs.length === 0 && recentWl.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">No recent activity</p>
                    ) : (
                        <div className="space-y-2">
                            {recentMsgs.map((msg: any) => (
                                <div key={msg.id} className="flex items-start gap-2">
                                    <div className="p-1 rounded-md bg-amber-50 mt-0.5">
                                        <MessageSquare className="w-3 h-3 text-amber-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-slate-700 truncate">{msg.name}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{msg.subject}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] uppercase shrink-0 h-4 px-1 font-medium">{msg.status}</Badge>
                                </div>
                            ))}
                            {recentWl.map((w: any) => (
                                <div key={w.id} className="flex items-start gap-2">
                                    <div className="p-1 rounded-md bg-violet-50 mt-0.5">
                                        <UserPlus className="w-3 h-3 text-violet-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-slate-700 truncate">{w.company_name}</p>
                                        <p className="text-[10px] text-slate-400">Wholesale Application</p>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] uppercase shrink-0 h-4 px-1 font-medium">{w.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
                <Suspense fallback={
                    <SectionCard className="p-3 sm:p-4 flex items-center justify-center h-32">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                    </SectionCard>
                }>
                    <LowStockPanel />
                </Suspense>
                <SectionCard className="p-3 sm:p-4">
                    <SectionTitle icon={<Sparkles />} label="Quick Metrics" />
                    <div className="space-y-2">
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                            <div className="flex items-center gap-1.5">
                                <BadgePercent className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-600">Promo Rate</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-800">{promoRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                            <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-600">New Customers</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-800">{newCount}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                            <div className="flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-600">Returning</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-800">{returningCount}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                            <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-600">Unread Msgs</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-800">{unreadMsg}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-1.5">
                                <UserPlus className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-600">Wholesale Pending</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-800">{pendingWl}</span>
                        </div>
                    </div>
                </SectionCard>
            </div>
        </div>
    )
}

// ─── Low Stock Panel ───

async function LowStockPanel() {
    const supabase = await createClient()
    const { data: items } = await supabase
        .from("product_variants")
        .select(`id, sku, title, stock, products(name)`)
        .lte("stock", 10).order("stock", { ascending: true }).limit(6)

    return (
        <SectionCard className="p-3 sm:p-4 h-full">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Low Stock</span>
                </div>
                <Link href="/admin/stock" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">View All →</Link>
            </div>
            {!items?.length ? (
                <p className="text-xs text-slate-400 italic text-center py-6">All stocked up!</p>
            ) : (
                <div className="space-y-1.5">
                    {items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-700 truncate">{item.products?.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                            </div>
                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                item.stock === 0 ? 'bg-red-50 text-red-600' :
                                item.stock <= 3 ? 'bg-orange-50 text-orange-600' :
                                'bg-amber-50 text-amber-600'
                            }`}>{item.stock}</div>
                        </div>
                    ))}
                </div>
            )}
        </SectionCard>
    )
}

