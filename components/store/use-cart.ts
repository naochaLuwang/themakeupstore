"use client"
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
    id: string;
    productId: string;
    categoryId: string;
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
    appliedPromo: { code: string; discount: number } | null;
    setAppliedPromo: (promo: { code: string; discount: number } | null) => void;
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
    getTotalPrice: () => number;
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

            // UX FIX: Sanitize items to ensure no duplicate variantIds ever enter state
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
                    // Item exists: Clone array and update specific index to avoid reference issues
                    const updatedItems = [...currentItems];
                    const existing = updatedItems[existingItemIndex];

                    updatedItems[existingItemIndex] = {
                        ...existing,
                        quantity: Math.min(existing.quantity + (newItem.quantity || 1), existing.stock)
                    };

                    set({ items: updatedItems });
                } else {
                    // Brand new item: Append to list
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

            clearCart: () => {
                set({
                    items: [],
                    appliedPromo: null,
                    selectedShippingId: null,
                    shippingPrice: 0,
                    shippingLabel: '',
                    shippingMethods: []
                });
            },

            totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),

            setShippingMethods: (methods) => set({ shippingMethods: methods }),

            setSelectedShipping: (id, price, label) => set({
                selectedShippingId: id,
                shippingPrice: price,
                shippingLabel: label || ''
            }),

            clearShipping: () => set({ selectedShippingId: null, shippingPrice: 0, shippingLabel: '' }),

            getTotalPrice: () => {
                const subtotal = get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                const discount = get().appliedPromo?.discount || 0;
                return Math.max(0, subtotal + get().shippingPrice - discount);
            }
        }),
        {
            name: 'shopping-cart',
            storage: createJSONStorage(() => localStorage),
            // Ensure we migrate or handle old data versions gracefully
            version: 1,
        }
    )
);