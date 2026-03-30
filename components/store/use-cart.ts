// "use client"
// import { create } from 'zustand';
// import { persist, createJSONStorage } from 'zustand/middleware';

// export interface CartItem {
//     id: string;
//     productId: string;
//     categoryId: string; // Ensure your Product Page passes this!
//     variantId: string;
//     name: string;
//     variantTitle: string;
//     price: number;
//     mrp: number;
//     image: string;
//     quantity: number;
//     stock: number;
// }

// interface CartStore {
//     items: CartItem[];
//     // UPDATED: Promo now stores full logic metadata
//     appliedPromo: {
//         code: string;
//         discount_type: 'percentage' | 'fixed';
//         discount_value: number;
//         max_discount_amount?: number;
//         min_order_amount?: number;
//         apply_to: 'all' | 'specific_products' | 'specific_categories';
//         productIds?: string[];
//         categoryIds?: string[];
//     } | null;
//     setAppliedPromo: (promo: any) => void;
//     addItem: (item: CartItem) => void;
//     removeItem: (variantId: string) => void;
//     updateQuantity: (variantId: string, quantity: number) => void;
//     setItems: (items: CartItem[]) => void;
//     clearCart: () => void;
//     totalItems: () => number;
//     shippingMethods: any[];
//     shippingPrice: number;
//     shippingLabel: string;
//     selectedShippingId: string | null;
//     setShippingMethods: (methods: any[]) => void;
//     setSelectedShipping: (id: string | null, price: number, label?: string) => void;
//     clearShipping: () => void;
// }

// export const useCart = create<CartStore>()(
//     persist(
//         (set, get) => ({
//             items: [],
//             appliedPromo: null,
//             shippingMethods: [],
//             selectedShippingId: null,
//             shippingPrice: 0,
//             shippingLabel: '',

//             setAppliedPromo: (promo) => set({ appliedPromo: promo }),

//             setItems: (newItems) => {
//                 const merged = newItems.reduce((acc: CartItem[], current) => {
//                     const existing = acc.find(item => item.variantId === current.variantId);
//                     if (existing) {
//                         existing.quantity += current.quantity;
//                         return acc;
//                     }
//                     return [...acc, current];
//                 }, []);
//                 set({ items: merged });
//             },

//             addItem: (newItem) => {
//                 const currentItems = get().items;
//                 const existingItemIndex = currentItems.findIndex(item => item.variantId === newItem.variantId);

//                 if (existingItemIndex > -1) {
//                     const updatedItems = [...currentItems];
//                     const existing = updatedItems[existingItemIndex];
//                     updatedItems[existingItemIndex] = {
//                         ...existing,
//                         quantity: Math.min(existing.quantity + (newItem.quantity || 1), existing.stock)
//                     };
//                     set({ items: updatedItems });
//                 } else {
//                     set({ items: [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }] });
//                 }
//             },

//             updateQuantity: (variantId, quantity) => {
//                 set({
//                     items: get().items.map(item =>
//                         item.variantId === variantId
//                             ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
//                             : item
//                     )
//                 });
//             },

//             removeItem: (variantId) => set({
//                 items: get().items.filter(item => item.variantId !== variantId)
//             }),

//             clearCart: () => set({
//                 items: [],
//                 appliedPromo: null,
//                 selectedShippingId: null,
//                 shippingPrice: 0,
//                 shippingLabel: '',
//                 shippingMethods: []
//             }),

//             totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
//             setShippingMethods: (methods) => set({ shippingMethods: methods }),
//             setSelectedShipping: (id, price, label) => set({
//                 selectedShippingId: id,
//                 shippingPrice: price,
//                 shippingLabel: label || ''
//             }),
//             clearShipping: () => set({ selectedShippingId: null, shippingPrice: 0, shippingLabel: '' }),
//         }),
//         {
//             name: 'shopping-cart',
//             storage: createJSONStorage(() => localStorage),
//             version: 2, // Incremented version because of appliedPromo structure change
//         }
//     )
// );

// "use client"

// import { create } from 'zustand';
// import { persist, createJSONStorage } from 'zustand/middleware';

// export interface CartItem {
//     id: string;
//     productId: string;
//     categoryId: string;
//     variantId: string;
//     name: string;
//     variantTitle: string;
//     price: number;
//     mrp: number;
//     image: string;
//     quantity: number;
//     stock: number;
// }

// interface CartStore {
//     items: CartItem[];
//     appliedPromo: any | null;

//     // Shipping State (Matched to your Admin Setup)
//     shippingPrice: number;
//     baseShippingPrice: number;
//     shippingLabel: string;
//     selectedShippingId: string | null;
//      // Renamed from selectedMethodId to fix the error

//     // Actions
//     addItem: (item: CartItem) => void;
//     removeItem: (variantId: string) => void;
//     updateQuantity: (variantId: string, quantity: number) => void;
//     setItems: (items: CartItem[]) => void;
//     setAppliedPromo: (promo: any) => void;

//     // Logistics Engine
//     setShippingMethod: (method: { id: string, name: string, price: number }) => void;
//     autoCalculateShipping: () => void;



//     clearCart: () => void;
//     totalItems: () => number;
//     getSubtotal: () => number;
//     clearShipping: () => void;
// }

// export const useCart = create<CartStore>()(
//     persist(
//         (set, get) => ({
//             items: [],
//             appliedPromo: null,
//             shippingPrice: 0,
//             baseShippingPrice: 0,
//             shippingLabel: '',
//             selectedShippingId: null, // Initial state renamed

//             getSubtotal: () => {
//                 return get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
//             },

//             setShippingMethod: (method) => {
//                 const subtotal = get().getSubtotal();
//                 const FREE_SHIPPING_THRESHOLD = 5000;

//                 const isFree = subtotal >= FREE_SHIPPING_THRESHOLD && subtotal > 0;

//                 set({
//                     selectedShippingId: method.id, // Corrected reference
//                     shippingLabel: method.name,
//                     baseShippingPrice: method.price,
//                     shippingPrice: isFree ? 0 : method.price
//                 });
//             },

//             autoCalculateShipping: () => {
//                 const { selectedShippingId, baseShippingPrice } = get(); // Corrected reference
//                 if (!selectedShippingId) return;

//                 const subtotal = get().getSubtotal();
//                 const FREE_SHIPPING_THRESHOLD = 5000;

//                 const isFree = subtotal >= FREE_SHIPPING_THRESHOLD && subtotal > 0;

//                 set({
//                     shippingPrice: isFree ? 0 : baseShippingPrice
//                 });
//             },

//             addItem: (newItem) => {
//                 const currentItems = get().items;
//                 const existingIndex = currentItems.findIndex(item => item.variantId === newItem.variantId);
//                 let updatedItems;

//                 if (existingIndex > -1) {
//                     updatedItems = [...currentItems];
//                     const existing = updatedItems[existingIndex];
//                     updatedItems[existingIndex] = {
//                         ...existing,
//                         quantity: Math.min(existing.quantity + (newItem.quantity || 1), existing.stock)
//                     };
//                 } else {
//                     updatedItems = [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }];
//                 }

//                 set({ items: updatedItems });
//                 get().autoCalculateShipping();
//             },

//             updateQuantity: (variantId, quantity) => {
//                 const updatedItems = get().items.map(item =>
//                     item.variantId === variantId
//                         ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
//                         : item
//                 );
//                 set({ items: updatedItems });
//                 get().autoCalculateShipping();
//             },

//             removeItem: (variantId) => {
//                 const remainingItems = get().items.filter(item => item.variantId !== variantId);
//                 set({ items: remainingItems });

//                 if (remainingItems.length === 0) {
//                     get().clearShipping();
//                 } else {
//                     get().autoCalculateShipping();
//                 }
//             },

//             setItems: (newItems) => {
//                 set({ items: newItems });
//                 get().autoCalculateShipping();
//             },

//             setAppliedPromo: (promo) => set({ appliedPromo: promo }),

//             clearCart: () => set({
//                 items: [],
//                 appliedPromo: null,
//                 selectedShippingId: null, // Corrected reference
//                 shippingPrice: 0,
//                 baseShippingPrice: 0,
//                 shippingLabel: ''
//             }),

//             clearShipping: () => set({
//                 selectedShippingId: null, // Corrected reference
//                 shippingPrice: 0,
//                 baseShippingPrice: 0,
//                 shippingLabel: ''
//             }),

//             totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
//         }),
//         {
//             name: 'shopping-cart',
//             storage: createJSONStorage(() => localStorage),
//             version: 7, // Bumped version to reset previous conflicting data
//         }
//     )
// );


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
    appliedPromo: any | null;

    // Shipping State
    shippingPrice: number;
    baseShippingPrice: number;
    shippingLabel: string;
    selectedShippingId: string | null;

    // Actions
    addItem: (item: CartItem) => void;
    removeItem: (variantId: string) => void;
    updateQuantity: (variantId: string, quantity: number) => void;
    setItems: (items: CartItem[]) => void;
    setAppliedPromo: (promo: any) => void;

    // Logistics Engine
    // ADDED BACK/RENAMED to match your component calls
    setShippingMethod: (method: { id: string, name: string, price: number }) => void;
    setSelectedShipping: (id: string | null, price: number, label?: string) => void;

    autoCalculateShipping: () => void;
    clearCart: () => void;
    totalItems: () => number;
    getSubtotal: () => number;
    getDiscountAmount: () => number;
    getFinalTotal: () => number;
    clearShipping: () => void;
}

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            appliedPromo: null,
            shippingPrice: 0,
            baseShippingPrice: 0,
            shippingLabel: '',
            selectedShippingId: null,

            getSubtotal: () => {
                return get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            },

            // This handles the new object-based logic
            setShippingMethod: (method) => {
                const subtotal = get().getSubtotal();
                const isFree = subtotal >= 3000 && subtotal > 0;

                set({
                    selectedShippingId: method.id,
                    shippingLabel: method.name,
                    baseShippingPrice: method.price,
                    shippingPrice: isFree ? 0 : method.price
                });
            },

            // This fixes the Type Error by providing the function your component is looking for
            setSelectedShipping: (id, price, label) => {
                const subtotal = get().getSubtotal();
                const isFree = subtotal >= 3000 && subtotal > 0;

                set({
                    selectedShippingId: id,
                    baseShippingPrice: price,
                    shippingPrice: isFree ? 0 : price,
                    shippingLabel: label || ''
                });
            },

            autoCalculateShipping: () => {
                const { selectedShippingId, baseShippingPrice } = get();
                if (!selectedShippingId) return;

                const isFree = get().getSubtotal() >= 3000;

                set({
                    shippingPrice: isFree ? 0 : baseShippingPrice
                });
            },

            addItem: (newItem) => {
                const currentItems = get().items;
                const existingIndex = currentItems.findIndex(item => item.variantId === newItem.variantId);
                let updatedItems;

                if (existingIndex > -1) {
                    updatedItems = [...currentItems];
                    updatedItems[existingIndex] = {
                        ...updatedItems[existingIndex],
                        quantity: Math.min(updatedItems[existingIndex].quantity + (newItem.quantity || 1), updatedItems[existingIndex].stock)
                    };
                } else {
                    updatedItems = [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }];
                }

                set({ items: updatedItems });
                get().autoCalculateShipping();
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
            },

            removeItem: (variantId) => {
                const remainingItems = get().items.filter(item => item.variantId !== variantId);
                set({ items: remainingItems });
                if (remainingItems.length === 0) get().clearShipping();
                else get().autoCalculateShipping();
            },

            setItems: (newItems) => {
                set({ items: newItems });
                get().autoCalculateShipping();
            },

            setAppliedPromo: (promo) => set({ appliedPromo: promo }),

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
                shippingLabel: ''
            }),

            getDiscountAmount: () => {
                const { items, appliedPromo } = get();
                if (!appliedPromo) return 0;

                // 1. Filter eligible items
                const eligibleItems = items.filter(item => {
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
                const shipping = get().shippingPrice;
                return Math.max(0, subtotal - discount + shipping);
            },

            totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
        }),
        {
            name: 'shopping-cart',
            storage: createJSONStorage(() => localStorage),
            version: 8, // Bumped to 8 to clear any v7 naming conflicts
        }
    )
);