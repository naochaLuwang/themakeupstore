"use client"
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
    id: string;
    productId: string;
    categoryId: string; // Ensure your Product Page passes this!
    variantId: string;
    name: string;
    variantTitle: string;
    price: number;
    mrp: number;
    image: string;
    quantity: number;
    stock: number;
}

interface CartStore {
    items: CartItem[];
    // UPDATED: Promo now stores full logic metadata
    appliedPromo: {
        code: string;
        discount_type: 'percentage' | 'fixed';
        discount_value: number;
        max_discount_amount?: number;
        min_order_amount?: number;
        apply_to: 'all' | 'specific_products' | 'specific_categories';
        productIds?: string[];
        categoryIds?: string[];
    } | null;
    setAppliedPromo: (promo: any) => void;
    addItem: (item: CartItem) => void;
    removeItem: (variantId: string) => void;
    updateQuantity: (variantId: string, quantity: number) => void;
    setItems: (items: CartItem[]) => void;
    clearCart: () => void;
    totalItems: () => number;
    shippingMethods: any[];
    shippingPrice: number;
    shippingLabel: string;
    selectedShippingId: string | null;
    setShippingMethods: (methods: any[]) => void;
    setSelectedShipping: (id: string | null, price: number, label?: string) => void;
    clearShipping: () => void;
}

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            appliedPromo: null,
            shippingMethods: [],
            selectedShippingId: null,
            shippingPrice: 0,
            shippingLabel: '',

            setAppliedPromo: (promo) => set({ appliedPromo: promo }),

            setItems: (newItems) => {
                const merged = newItems.reduce((acc: CartItem[], current) => {
                    const existing = acc.find(item => item.variantId === current.variantId);
                    if (existing) {
                        existing.quantity += current.quantity;
                        return acc;
                    }
                    return [...acc, current];
                }, []);
                set({ items: merged });
            },

            addItem: (newItem) => {
                const currentItems = get().items;
                const existingItemIndex = currentItems.findIndex(item => item.variantId === newItem.variantId);

                if (existingItemIndex > -1) {
                    const updatedItems = [...currentItems];
                    const existing = updatedItems[existingItemIndex];
                    updatedItems[existingItemIndex] = {
                        ...existing,
                        quantity: Math.min(existing.quantity + (newItem.quantity || 1), existing.stock)
                    };
                    set({ items: updatedItems });
                } else {
                    set({ items: [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }] });
                }
            },

            updateQuantity: (variantId, quantity) => {
                set({
                    items: get().items.map(item =>
                        item.variantId === variantId
                            ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
                            : item
                    )
                });
            },

            removeItem: (variantId) => set({
                items: get().items.filter(item => item.variantId !== variantId)
            }),

            clearCart: () => set({
                items: [],
                appliedPromo: null,
                selectedShippingId: null,
                shippingPrice: 0,
                shippingLabel: '',
                shippingMethods: []
            }),

            totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
            setShippingMethods: (methods) => set({ shippingMethods: methods }),
            setSelectedShipping: (id, price, label) => set({
                selectedShippingId: id,
                shippingPrice: price,
                shippingLabel: label || ''
            }),
            clearShipping: () => set({ selectedShippingId: null, shippingPrice: 0, shippingLabel: '' }),
        }),
        {
            name: 'shopping-cart',
            storage: createJSONStorage(() => localStorage),
            version: 2, // Incremented version because of appliedPromo structure change
        }
    )
);