import {
    CircleDollarSign,
    ShoppingCart,
    TrendingUp,
    CreditCard
} from "lucide-react"

interface Order {
    total: number
    status: string
    created_at: string
}

export function StatsCards({ orders }: { orders: Order[] }) {
    const totalRevenue = orders.reduce((acc, order) => acc + Number(order.total), 0)
    const aov = orders.length > 0 ? totalRevenue / orders.length : 0
    const pendingOrders = orders.filter(o => o.status === 'pending').length

    const stats = [
        {
            label: "Total Revenue",
            value: `₹${totalRevenue.toLocaleString('en-IN')}`,
            description: "Total sales in selected range",
            icon: CircleDollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
        {
            label: "Total Orders",
            value: orders.length,
            description: "Successful transactions",
            icon: ShoppingCart,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            label: "Avg. Order Value",
            value: `₹${Math.round(aov).toLocaleString('en-IN')}`,
            description: "Average spent per order",
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50"
        },
        {
            label: "Pending Orders",
            value: pendingOrders,
            description: "Needs fulfillment",
            icon: CreditCard,
            color: "text-amber-600",
            bg: "bg-amber-50"
        }
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        <div className={`p-2 rounded-lg ${stat.bg}`}>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                    <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
                </div>
            ))}
        </div>
    )
}