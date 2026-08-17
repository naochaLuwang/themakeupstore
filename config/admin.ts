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
    Award,
    MessageSquare,
    Package,
    Timer,
    Percent,
    Clock,
    CreditCard,
    Bell,
    UserCheck,
    MapPin,
    Activity,
    Wallet,
    Megaphone,
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
                { title: "Abandoned Carts", href: "/admin/abandoned-carts", icon: Timer },
            ],
        },
        {
            label: "Products",
            items: [
                { title: "Products", href: "/admin/products", icon: ShoppingBag },
                { title: "Categories", href: "/admin/categories", icon: FolderTree },
                { title: "Tags", href: "/admin/tags", icon: Tag },
                { title: "Stock", href: "/admin/stock", icon: Archive },
                { title: "Inventory", href: "/admin/inventory", icon: PackageSearch },
                { title: "Pricing", href: "/admin/pricing", icon: TrendingUp },
            ],
        },
        {
            label: "Marketing",
            items: [
                { title: "Promos", href: "/admin/promos", icon: Tag },
                { title: "Free Gifts", href: "/admin/free-gifts", icon: Gift },
                { title: "Gift Products", href: "/admin/gift-products", icon: Package },
                { title: "Buy X Get Y", href: "/admin/bxgy", icon: Percent },
                { title: "Flash Sales", href: "/admin/flash-sales", icon: Clock },
                { title: "Hero Banners", href: "/admin/hero-banners", icon: Image },
                { title: "Showcase", href: "/admin/showcase", icon: Sparkles },
                { title: "Broadcast", href: "/admin/broadcast", icon: Megaphone },
            ],
        },
        {
            label: "Loyalty & Rewards",
            items: [
                { title: "Rewards", href: "/admin/rewards", icon: Award },
                { title: "Reward Users", href: "/admin/rewards/users", icon: Users },
                { title: "Gift Cards", href: "/admin/gift-cards", icon: CreditCard },
            ],
        },
        {
            label: "Customer Service",
            items: [
                { title: "Messages", href: "/admin/messages", icon: Mail },
                { title: "Reviews", href: "/admin/reviews", icon: Star },
                { title: "Back in Stock", href: "/admin/inventory/demand", icon: Bell },
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
            label: "Finance",
            items: [
                { title: "Purchase", href: "/admin/purchase", icon: Receipt },
                { title: "Purchase History", href: "/admin/purchase/list", icon: History },
            ],
        },
        {
            label: "Admin",
            items: [
                { title: "Customers", href: "/admin/customers", icon: UserCheck },
                { title: "Shipping", href: "/admin/shipping", icon: MapPin },
                { title: "Delivery Partners", href: "/admin/delivery-partners", icon: Truck },
                { title: "Visitor History", href: "/admin/visitor-history", icon: Activity },
                { title: "Wholesale", href: "/admin/wholesale", icon: Store },
                { title: "WhatsApp", href: "/admin/whatsapp", icon: MessageSquare },
                { title: "Legal Settings", href: "/admin/settings/legal", icon: Settings },
            ],
        },
    ] as SidebarGroup[],
}
