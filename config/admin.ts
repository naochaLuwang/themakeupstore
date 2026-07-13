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
    Radio,
    BarChart3,
    DollarSign,
    TrendingUp,
    RotateCcw,
    ShoppingCart,
    Tag,
    Receipt,
    Archive,
    History,
    Store,
    Image,
    AlertTriangle,
    Sparkles,
    Gift,
    Zap,
    Award,
    MessageSquare,
} from "lucide-react"

export interface SidebarGroup {
    label: string
    items: { title: string; href: string; icon: any }[]
}

export const adminConfig = {
    sidebarGroups: [
        {
            label: "Dashboard",
            items: [
                { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
            ],
        },
        {
            label: "Orders",
            items: [
                { title: "Orders", href: "/admin/orders", icon: ClipboardList },
                { title: "Return Requests", href: "/admin/return-requests", icon: RotateCcw },
                { title: "Concerns", href: "/admin/concerns", icon: AlertTriangle },
                { title: "Live Carts", href: "/admin/live-carts", icon: ShoppingCart },
                { title: "Abandoned Carts", href: "/admin/abandoned-carts", icon: ShoppingCart },
            ],
        },
        {
            label: "Products",
            items: [
                { title: "Products", href: "/admin/products", icon: ShoppingBag },
                { title: "Categories", href: "/admin/categories", icon: FolderTree },
                { title: "Stock", href: "/admin/stock", icon: Archive },
                { title: "Inventory", href: "/admin/inventory", icon: PackageSearch },
                { title: "Pricing", href: "/admin/pricing", icon: TrendingUp },
            ],
        },
        {
            label: "Promotions",
            items: [
                { title: "Promos", href: "/admin/promos", icon: Tag },
                { title: "Free Gifts", href: "/admin/free-gifts", icon: Gift },
                { title: "Buy X Get Y", href: "/admin/bxgy", icon: Zap },
                { title: "Gift Cards", href: "/admin/gift-cards", icon: Gift },
                { title: "Rewards", href: "/admin/rewards", icon: Award },
                { title: "Hero Banners", href: "/admin/hero-banners", icon: Image },
                { title: "Showcase", href: "/admin/showcase", icon: Sparkles },
                { title: "Broadcast", href: "/admin/broadcast", icon: Radio },
            ],
        },
        {
            label: "Customer Service",
            items: [
                { title: "Messages", href: "/admin/messages", icon: Mail },
                { title: "Reviews", href: "/admin/reviews", icon: Star },
                { title: "Back in Stock", href: "/admin/inventory/demand", icon: TrendingUp },
            ],
        },
        {
            label: "Reports",
            items: [
                { title: "Revenue Report", href: "/admin/reports/revenue", icon: DollarSign },
                { title: "Sales Report", href: "/admin/reports/sales", icon: BarChart3 },
            ],
        },
        {
            label: "Admin",
            items: [
                { title: "Customers", href: "/admin/customers", icon: Users },
                { title: "Shipping", href: "/admin/shipping", icon: Truck },
                { title: "Delivery Partners", href: "/admin/delivery-partners", icon: Truck },
                { title: "Purchase", href: "/admin/purchase", icon: Receipt },
                { title: "Purchase History", href: "/admin/purchase/list", icon: History },
                { title: "Visitor History", href: "/admin/visitor-history", icon: History },
                { title: "Wholesale", href: "/admin/wholesale", icon: Store },
                { title: "Legal Settings", href: "/admin/settings/legal", icon: Settings },
            ],
        },
    ] as SidebarGroup[],
}
