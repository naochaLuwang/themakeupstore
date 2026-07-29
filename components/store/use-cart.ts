"use client"

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_PINCODES } from '@/lib/cart-constants';

export interface CartItem {
    id: string;
    productId: string;
    categoryId: string;
    variantId: string;
    name: string;
    variantTitle: string;
    price: number;
    mrp: number;
    originalPrice: number;
    image: string;
    quantity: number;
    stock: number;
    is_gift?: boolean;
    gift_rule_id?: string;
    is_bxgy_free?: boolean;
    bxgy_rule_id?: string;
}

export interface BXGYDiscount {
    rule_id: string;
    rule_name: string;
    variant_id: string;
    product_id: string;
    product_name: string;
    discount_amount: number;
    original_price: number;
    free_quantity: number;
}

export interface GiftProgress {
    ruleId: string;
    ruleName: string;
    giftProductName: string;
    giftProductImage: string;
    qualifies: boolean;
    qualifyingVariantIds: string[];
    qualifyingLabel: string;
    currentQty: number;
    neededQty: number;
    currentSubtotal: number;
    neededAmount: number;
    triggerType: string;
}

export interface BXGYProgress {
    ruleId: string;
    ruleName: string;
    qualifies: boolean;
    qualifyingVariantIds: string[];
    qualifyingLabel: string;
    getLabel: string;
    getImage: string;
    currentQty: number;
    neededQty: number;
    buyQuantity: number;
    getType: string;
}

interface CartStore {
    items: CartItem[];
    appliedPromo: any | null;
    bxgyDiscounts: BXGYDiscount[];
    giftProgress: GiftProgress[];
    bxgyProgress: BXGYProgress[];

    // Shipping State
    shippingPrice: number;
    baseShippingPrice: number;
    shippingLabel: string;
    deliveryTimeLabel: string;
    selectedShippingId: string | null;
    shippingPincode: string;

    // Actions
    addItem: (item: CartItem) => { capped: boolean; maxQty: number };
    removeItem: (variantId: string) => void;
    updateQuantity: (variantId: string, quantity: number) => void;
    setItems: (items: CartItem[]) => void;
    setAppliedPromo: (promo: any) => void;
    setBXGYDiscounts: (discounts: BXGYDiscount[]) => void;
    setBXGYProgress: (progress: BXGYProgress[]) => void;
    setGiftProgress: (progress: GiftProgress[]) => void;
    removeGift: (variantId: string) => void;

    // Logistics Engine
    setShippingMethod: (method: { id: string, name: string, price: number, delivery_time_label?: string }) => void;
    setSelectedShipping: (id: string | null, price: number, label?: string) => void;
    setShippingPincode: (pincode: string) => void;

    autoCalculateShipping: () => void;
    autoRevalidatePromo: () => void;
    clearCart: () => void;
    totalItems: () => number;
    getSubtotal: () => number;
    getGiftItems: () => CartItem[];
    getBXGYTotalDiscount: () => number;
    getDiscountAmount: () => number;
    getFinalTotal: () => number;
    clearShipping: () => void;
}

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            appliedPromo: null,
            bxgyDiscounts: [],
            giftProgress: [],
            bxgyProgress: [],
            shippingPrice: 0,
            baseShippingPrice: 0,
            shippingLabel: '',
            deliveryTimeLabel: '',
            selectedShippingId: null,
            shippingPincode: '',

            getSubtotal: () => {
                return get().items
                    .filter(item => !item.is_gift && !item.is_bxgy_free)
                    .reduce((acc, item) => acc + (item.price * item.quantity), 0);
            },

            pincodeQualifiesForFree: (pincode: string) => {
                return FREE_SHIPPING_PINCODES.includes(pincode)
            },

            // This handles the new object-based logic
            setShippingMethod: (method) => {
                const subtotal = get().getSubtotal();
                const pincode = get().shippingPincode;
                const pincodeOk = FREE_SHIPPING_PINCODES.includes(pincode)
                const isFree = subtotal >= FREE_SHIPPING_THRESHOLD && subtotal > 0 && pincodeOk;

                set({
                    selectedShippingId: method.id,
                    shippingLabel: method.name,
                    baseShippingPrice: method.price,
                    shippingPrice: isFree ? 0 : method.price,
                    deliveryTimeLabel: method.delivery_time_label || ''
                });
            },

            // This fixes the Type Error by providing the function your component is looking for
            setSelectedShipping: (id, price, label) => {
                const subtotal = get().getSubtotal();
                const pincode = get().shippingPincode;
                const pincodeOk = FREE_SHIPPING_PINCODES.includes(pincode)
                const isFree = subtotal >= FREE_SHIPPING_THRESHOLD && subtotal > 0 && pincodeOk;

                set({
                    selectedShippingId: id,
                    baseShippingPrice: price,
                    shippingPrice: isFree ? 0 : price,
                    shippingLabel: label || ''
                });
            },

            autoCalculateShipping: () => {
                const { selectedShippingId, baseShippingPrice, shippingPincode } = get();
                if (!selectedShippingId) return;

                const pincodeOk = FREE_SHIPPING_PINCODES.includes(shippingPincode)
                const isFree = get().getSubtotal() >= FREE_SHIPPING_THRESHOLD && pincodeOk;

                set({
                    shippingPrice: isFree ? 0 : baseShippingPrice
                });
            },

            setShippingPincode: (pincode: string) => {
                set({ shippingPincode: pincode })
                get().autoCalculateShipping()
            },

            addItem: (newItem) => {
                // Prevent manual addition of gift/BXGY items
                if (newItem.is_gift || newItem.is_bxgy_free) {
                    const currentItems = get().items;
                    const alreadyExists = currentItems.some(i => i.variantId === newItem.variantId);
                    if (alreadyExists) return { capped: false, maxQty: 0 };
                    const updatedItems = [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }];
                    set({ items: updatedItems });
                    get().autoCalculateShipping();
                    return { capped: false, maxQty: 0 };
                }

                const currentItems = get().items;
                const existingIndex = currentItems.findIndex(item => item.variantId === newItem.variantId);
                let updatedItems;
                let capped = false;
                let maxQty = 0;

                if (existingIndex > -1) {
                    updatedItems = [...currentItems];
                    const existing = updatedItems[existingIndex];
                    const desired = existing.quantity + (newItem.quantity || 1);
                    const cappedQty = Math.min(desired, existing.stock);
                    capped = cappedQty < desired;
                    maxQty = existing.stock;
                    updatedItems[existingIndex] = {
                        ...existing,
                        quantity: cappedQty
                    };
                } else {
                    const qty = newItem.quantity || 1;
                    const cappedQty = Math.min(qty, newItem.stock);
                    capped = cappedQty < qty;
                    maxQty = newItem.stock;
                    updatedItems = [...currentItems, { ...newItem, quantity: cappedQty }];
                }

                set({ items: updatedItems });
                get().autoCalculateShipping();
                return { capped, maxQty };
            },

            updateQuantity: (variantId, quantity) => {
                set({
                    items: get().items.map(item =>
                        item.variantId === variantId
                            ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
                            : item
                    )
                });
                get().autoCalculateShipping();
                get().autoRevalidatePromo();
            },

            removeItem: (variantId) => {
                const { items } = get();
                // Also remove any gift items linked to this product's gifts
                const remainingItems = items.filter(item => item.variantId !== variantId);
                // Remove gifts whose trigger product was removed ( gifts with gift_rule_id still in cart from other items remain)
                set({ items: remainingItems });
                if (remainingItems.length === 0) get().clearShipping();
                else get().autoCalculateShipping();
                get().autoRevalidatePromo();
            },

            setItems: (newItems) => {
                set({ items: newItems });
                get().autoCalculateShipping();
                get().autoRevalidatePromo();
            },

            setAppliedPromo: (promo) => set({ appliedPromo: promo }),

            // Re-validates applied promo against current cart. Clears promo if no longer eligible.
            autoRevalidatePromo: () => {
                const { appliedPromo, items } = get();
                if (!appliedPromo) return;

                // Check eligibility based on targeting
                const eligibleItems = items.filter(item => {
                    if (appliedPromo.eligibleVariantIds) {
                        return appliedPromo.eligibleVariantIds.includes(item.variantId);
                    }
                    if (appliedPromo.apply_to === 'all') return true;
                    if (appliedPromo.apply_to === 'specific_products') {
                        return appliedPromo.allowedProductIds?.includes(String(item.productId));
                    }
                    if (appliedPromo.apply_to === 'specific_categories') {
                        return appliedPromo.allowedCategoryIds?.includes(String(item.categoryId));
                    }
                    return false;
                });

                if (eligibleItems.length === 0) {
                    set({ appliedPromo: null });
                    return;
                }

                const eligibleSubtotal = eligibleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                const minOrder = appliedPromo.min_order_amount || 0;
                if (eligibleSubtotal < minOrder) {
                    set({ appliedPromo: null });
                }
            },

            clearCart: () => set({
                items: [],
                appliedPromo: null,
                selectedShippingId: null,
                shippingPrice: 0,
                baseShippingPrice: 0,
                shippingLabel: ''
            }),

            clearShipping: () => set({
                selectedShippingId: null,
                shippingPrice: 0,
                baseShippingPrice: 0,
                shippingLabel: '',
                deliveryTimeLabel: ''
            }),

            removeGift: (variantId) => {
                set({ items: get().items.filter(item => item.variantId !== variantId) });
            },

            setBXGYDiscounts: (discounts) => set({ bxgyDiscounts: discounts }),
            setBXGYProgress: (progress) => set({ bxgyProgress: progress }),
            setGiftProgress: (progress) => set({ giftProgress: progress }),

            getGiftItems: () => get().items.filter(item => item.is_gift),

            getBXGYTotalDiscount: () => {
                const { bxgyDiscounts } = get();
                return bxgyDiscounts.reduce((sum, d) => sum + d.discount_amount, 0);
            },

            getDiscountAmount: () => {
                const { items, appliedPromo } = get();
                if (!appliedPromo) return 0;

                // 1. Filter eligible items
                const eligibleItems = items.filter(item => {
                    if (appliedPromo.eligibleVariantIds) {
                        return appliedPromo.eligibleVariantIds.includes(item.variantId);
                    }
                    if (appliedPromo.apply_to === 'all') return true;
                    if (appliedPromo.apply_to === 'specific_products') {
                        return appliedPromo.allowedProductIds?.includes(String(item.productId));
                    }
                    if (appliedPromo.apply_to === 'specific_categories') {
                        return appliedPromo.allowedCategoryIds?.includes(String(item.categoryId));
                    }
                    return false;
                });

                if (eligibleItems.length === 0) return 0;

                const eligibleSubtotal = eligibleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                // 2. Minimum order amount check
                if (eligibleSubtotal < (appliedPromo.min_order_amount || 0)) return 0;

                // 3. Calculate discount
                let discount = 0;
                if (appliedPromo.discount_type === 'percentage') {
                    discount = (eligibleSubtotal * appliedPromo.discount_value) / 100;
                    if (appliedPromo.max_discount_amount) {
                        discount = Math.min(discount, appliedPromo.max_discount_amount);
                    }
                } else {
                    discount = appliedPromo.discount_value;
                    // For fixed discounts, ensure it doesn't exceed eligible subtotal
                    discount = Math.min(discount, eligibleSubtotal);
                }

                return Math.round(discount);
            },

            getFinalTotal: () => {
                const subtotal = get().getSubtotal();
                const discount = get().getDiscountAmount();
                const bxgyDiscount = get().getBXGYTotalDiscount();
                const shipping = get().shippingPrice;
                return Math.max(0, subtotal - discount - bxgyDiscount + shipping);
            },

            totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
        }),
        {
            name: 'shopping-cart',
            storage: createJSONStorage(() => localStorage),
            version: 10, // Bumped to 9 for free_gifts/bxgy fields
        }
    )
);

