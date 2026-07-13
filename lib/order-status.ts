export const ALL_STATUSES = [
    "pending", "confirmed", "packed", "shipped",
    "out_for_delivery", "failed_delivery",
    "ready_for_pickup", "no_show",
    "delivered", "picked_up", "cancelled",
] as const

export type OrderStatus = typeof ALL_STATUSES[number]

export const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    packed: "Packed",
    shipped: "Shipped",
    out_for_delivery: "Out for Delivery",
    failed_delivery: "Failed Delivery",
    ready_for_pickup: "Ready for Pickup",
    no_show: "No Show",
    delivered: "Delivered",
    picked_up: "Picked Up",
    cancelled: "Cancelled",
}

export const VALID_TRANSITIONS: Record<string, Record<string, string[]>> = {
    delivery: {
        pending: ["confirmed", "cancelled"],
        confirmed: ["packed", "pending", "cancelled"],
        packed: ["shipped", "cancelled"],
        shipped: ["out_for_delivery"],
        out_for_delivery: ["delivered", "failed_delivery"],
        failed_delivery: ["out_for_delivery", "cancelled"],
        delivered: [],
        cancelled: [],
    },
    pickup: {
        pending: ["confirmed", "cancelled"],
        confirmed: ["packed", "pending", "cancelled"],
        packed: ["ready_for_pickup", "cancelled"],
        ready_for_pickup: ["picked_up", "no_show", "packed"],
        no_show: ["cancelled"],
        picked_up: [],
        cancelled: [],
    },
}

export function getValidNextStatuses(orderType: string, currentStatus: string): string[] {
    const type = orderType === "pickup" ? "pickup" : "delivery"
    return VALID_TRANSITIONS[type]?.[currentStatus] || []
}

export const STATUS_TIMESTAMPS: Record<string, string> = {
    confirmed: "confirmed_at",
    out_for_delivery: "out_for_delivery_at",
    failed_delivery: "failed_delivery_at",
    delivered: "delivered_at",
    ready_for_pickup: "ready_for_pickup_at",
    picked_up: "picked_up_at",
    no_show: "no_show_at",
}

export function getTypeStatuses(orderType: string): string[] {
    const trans = VALID_TRANSITIONS[orderType === "pickup" ? "pickup" : "delivery"]
    if (!trans) return []
    const set = new Set<string>()
    for (const [from, toList] of Object.entries(trans)) {
        set.add(from)
        toList.forEach(s => set.add(s))
    }
    // ensure cancelled is always included
    set.add("cancelled")
    return Array.from(set)
}

export const PUSH_MESSAGES: Record<string, string> = {
    confirmed: "Your order has been confirmed! We'll start preparing it soon.",
    packed: "Your order has been packed and is ready for dispatch! 📦",
    shipped: "Great news! Your order has been shipped. 🚚",
    out_for_delivery: "Your order is out for delivery! 📬",
    delivered: "Your package has been delivered! Enjoy. 💖",
    ready_for_pickup: "Your order is ready for pickup! 🏪",
    picked_up: "Thank you for picking up your order! 💖",
    failed_delivery: "Delivery attempt failed. We'll try again soon.",
}
