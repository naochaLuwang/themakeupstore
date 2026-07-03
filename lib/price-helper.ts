export function calculateDiscountedPrice(originalPrice: number, type: 'percentage' | 'amount' | 'none', value: number) {
    if (!type || type === 'none' || !value) return originalPrice;

    if (type === 'percentage') {
        const discountAmount = (originalPrice * value) / 100;
        return Math.round(Math.max(0, originalPrice - discountAmount));
    }

    if (type === 'amount') {
        return Math.round(Math.max(0, originalPrice - value));
    }

    return originalPrice;
}