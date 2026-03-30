import {
    LayoutDashboard,
    ShoppingBag,
    FolderTree,
    Settings,
    Users,
    PackageSearch,
    Truck,
    ClipboardList,
    Mail,
    Star,
    Radio,      // New for Broadcast
    BarChart3,  // New for Reports
    DollarSign, // For Revenue Report
    TrendingUp, // For Sales Report
    BookOpen,
    ShoppingCart,
    Activity,
    Tag,
    Receipt,
    Archive,
    History,
    Store
} from "lucide-react"

export const adminConfig = {
    sidebarNav: [
        { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { title: "Products", href: "/admin/products", icon: ShoppingBag },
        { title: "Categories", href: "/admin/categories", icon: FolderTree },
        { title: "Orders", href: "/admin/orders", icon: ClipboardList },
        { title: "Inventory", href: "/admin/inventory", icon: PackageSearch },
        { title: "Customers", href: "/admin/customers", icon: Users },
        { title: "Shipping", href: "/admin/shipping", icon: Truck },
        { title: "Pricing", href: "/admin/pricing", icon: PackageSearch },

        // --- Added Broadcast Section ---
        { title: "Broadcast", href: "/admin/broadcast", icon: Radio },

        { title: "Messages", href: "/admin/messages", icon: Mail },
        { title: "Reviews", href: "/admin/reviews", icon: Star },
        { title: "Back in Stock Request", href: "/admin/inventory/demand", icon: TrendingUp },

        // --- Additional Admin Links ---
        { title: "Live Carts", href: "/admin/live-carts", icon: ShoppingCart },
        { title: "Promos", href: "/admin/promos", icon: Tag },
        { title: "Purchase", href: "/admin/purchase", icon: Receipt },
        { title: "Purchase History", href: "/admin/purchase/list", icon: History },
        { title: "Stock", href: "/admin/stock", icon: Archive },
        { title: "Visitor History", href: "/admin/visitor-history", icon: History },
        { title: "Wholesale", href: "/admin/wholesale", icon: Store },

        // --- Added Reports Section ---
        {
            title: "Revenue Report",
            href: "/admin/reports/revenue",
            icon: DollarSign
        },
        {
            title: "Sales Report",
            href: "/admin/reports/sales",
            icon: BarChart3
        },

        { title: "Legal Settings", href: "/admin/settings/legal", icon: Settings },
    ],
}