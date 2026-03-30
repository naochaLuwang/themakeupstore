
export interface CartItem {
    productId: string;
    categoryId: string;
    price: number;
    quantity: number;
}

export interface PromoTargeting {
    apply_to: 'all' | 'specific_products' | 'specific_categories';
    promo_code_products?: { product_id: string }[];
    promo_code_categories?: { category_id: string }[];
}

export interface Promo extends PromoTargeting {
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
}

export function checkPromoEligibility(promo: any, items: CartItem[]) {
    // 1. Identify eligible items based on targeting
    const eligibleItems = items.filter(item => {
        if (promo.apply_to === 'all') return true;
        if (promo.apply_to === 'specific_products') {
            const allowedIds = promo.promo_code_products?.map((p: any) => String(p.product_id)) || [];
            return allowedIds.includes(String(item.productId));
        }
        if (promo.apply_to === 'specific_categories') {
            const allowedIds = promo.promo_code_categories?.map((c: any) => String(c.category_id)) || [];
            return allowedIds.includes(String(item.categoryId));
        }
        return false;
    });

    const hasEligibleItems = eligibleItems.length > 0;
    const eligibleSubtotal = eligibleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const minAmount = Number(promo.min_order_amount || 0);
    const isMinMet = eligibleSubtotal >= minAmount;

    const reasons: string[] = [];
    if (!hasEligibleItems) {
        if (promo.apply_to === 'specific_products') reasons.push("Not applicable to items in your bag");
        else if (promo.apply_to === 'specific_categories') reasons.push("Only for specific categories");
    } else if (!isMinMet) {
        reasons.push(`Add ₹${(minAmount - eligibleSubtotal).toLocaleString()} more to unlock`);
    }

    return {
        isEligible: hasEligibleItems && isMinMet,
        eligibleItems,
        eligibleSubtotal,
        reasons
    };
}

export function checkProductPromoEligibility(promo: any, product: { id: string, categoryIds: string[] }) {
    let isEligible = false;
    const reasons: string[] = [];

    if (promo.apply_to === 'all') {
        isEligible = true;
    } else if (promo.apply_to === 'specific_products') {
        const allowedIds = promo.promo_code_products?.map((p: any) => String(p.product_id)) || [];
        isEligible = allowedIds.includes(String(product.id));
        if (!isEligible) reasons.push("Valid for other specific products");
    } else if (promo.apply_to === 'specific_categories') {
        const allowedIds = promo.promo_code_categories?.map((c: any) => String(c.category_id)) || [];
        isEligible = product.categoryIds.some(cid => allowedIds.includes(String(cid)));
        if (!isEligible) reasons.push("Available for other categories");
    }

    return {
        isEligible,
        reasons
    };
}
