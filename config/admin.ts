import {
    LayoutDashboard,
    ShoppingBag,
    FolderTree,
    Settings,
    Users,
    PackageSearch, // Better for Inventory
    Truck,         // Better for Shipping
    ClipboardList, Mail,
    Star // Better for Orders
} from "lucide-react"

export const adminConfig = {
    sidebarNav: [
        { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { title: "Products", href: "/admin/products", icon: ShoppingBag },
        { title: "Categories", href: "/admin/categories", icon: FolderTree },
        { title: "Orders", href: "/admin/orders", icon: ClipboardList }, // Changed to Checklist icon
        { title: "Inventory", href: "/admin/inventory", icon: PackageSearch }, // Changed to Package Search
        { title: "Customers", href: "/admin/customers", icon: Users }, // Added to match e-commerce flow
        { title: "Shipping", href: "/admin/shipping", icon: Truck },
        { title: "Pricing", href: "/admin/pricing", icon: PackageSearch },  // Changed to Package Search icon
        { title: "Messages", href: "/admin/messages", icon: Mail },
        { title: "Reviews", href: "/admin/reviews", icon: Star },
        // Added Messages section
        { title: "Legal Settings", href: "/admin/settings/legal", icon: Settings },
    ],
}