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
    appliedPromo: { code: string; discount: number } | null; // Added
    setAppliedPromo: (promo: { code: string; discount: number } | null) => void; // Added
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
            appliedPromo: null, // Initialized
            shippingMethods: [],
            selectedShippingId: null,
            shippingPrice: 0,
            shippingLabel: '',

            setAppliedPromo: (promo) => set({ appliedPromo: promo }),

            setItems: (items) => set({ items }),

            addItem: (newItem) => {
                const currentItems = get().items;
                const existingItem = currentItems.find(item => item.variantId === newItem.variantId);
                if (existingItem) {
                    set({
                        items: currentItems.map(item =>
                            item.variantId === newItem.variantId
                                ? { ...item, quantity: Math.min(item.quantity + newItem.quantity, item.stock) }
                                : item
                        ),
                    });
                } else {
                    set({ items: [...currentItems, newItem] });
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
            storage: createJSONStorage(() => localStorage)
        }
    )
);