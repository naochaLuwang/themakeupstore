export function getWholesalePrice(basePrice: number, categoryRule: any) {
    if (!categoryRule || !categoryRule.is_active) return null;

    const discount = categoryRule.discount_percentage / 100;
    const price = Math.floor(basePrice * (1 - discount));

    return {
        price,
        moq: categoryRule.min_order_quantity,
        discount: categoryRule.discount_percentage
    };
}