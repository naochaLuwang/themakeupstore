
export const ANNIVERSARY_SALE = {
    START_DATE: '2026-04-01T00:00:00',
    END_DATE: '2026-04-05T23:59:59',
    TIERS: {
        '10': ['Charlotte Tilbury', 'Fenty Beauty', 'Huda Beauty', 'Kryolan', 'Nars', 'PAC', 'Rare Beauty', 'Too Faced'],
        '20': ['COSRX', 'Forever52', 'Kylie', 'MAC', 'Maybelline', 'Minimalist', 'Nykaa', 'TirTir'],
        '30': ['Focallure', 'LA Girl', 'Makeup Revolution', 'Mars', 'Milani', 'Relove']
    }
}

export function isAnniversarySaleLive() {
    const now = new Date().getTime();
    const start = new Date(ANNIVERSARY_SALE.START_DATE).getTime();
    const end = new Date(ANNIVERSARY_SALE.END_DATE).getTime();
    return now >= start && now <= end;
}

export function getAnniversaryDiscount(brandName: string | null | undefined): number {
    if (!brandName || !isAnniversarySaleLive()) return 0;

    const normalizedBrand = brandName.trim();
    
    // Check Tiers
    if (ANNIVERSARY_SALE.TIERS['10'].some(b => b.toLowerCase() === normalizedBrand.toLowerCase())) return 10;
    if (ANNIVERSARY_SALE.TIERS['20'].some(b => b.toLowerCase() === normalizedBrand.toLowerCase())) return 20;
    if (ANNIVERSARY_SALE.TIERS['30'].some(b => b.toLowerCase() === normalizedBrand.toLowerCase())) return 30;

    return 0;
}

export function calculateAnniversaryPrice(originalPrice: number, brandName: string | null | undefined): number {
    const discount = getAnniversaryDiscount(brandName);
    if (discount === 0) return originalPrice;
    
    return Math.round(originalPrice * (1 - discount / 100));
}
