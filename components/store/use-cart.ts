"use client"

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { roundMoney } from '@/lib/promotion-engine';
import { paidCartKey } from '@/lib/cart-key';
import type { merchandiseQuote } from '@/lib/cart-quote';
import { lineSubtotal, type PriceGroup } from '@/lib/line-pricing';
import { evaluatePromotionSnapshot, type PromotionSnapshot } from '@/lib/promotion-preview';
import { FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_PINCODES } from '@/lib/cart-constants';

export interface CartItem {
    id: string;
    productId: string;
    categoryId: string;
    categoryIds?: string[];
    brand?: string;
    variantId: string;
    name: string;
    variantTitle: string;
    price: number;
    regularPrice?: number;
    mrp: number;
    originalPrice: number;
    image: string;
    quantity: number;
    stock: number;
    is_gift?: boolean;
    gift_rule_id?: string;
    is_bxgy_free?: boolean;
    bxgy_rule_id?: string;
    gift_product_ref_id?: string;
    inventoryVariantId?: string;
    priceBreakdown?: PriceGroup[];
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
    freeQtyApplied?: number;
    setProgress?: number;
    pricingMode?: 'replace_discounts' | 'combine_discounts';
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
    offerStatus: 'idle' | 'loading' | 'ready' | 'preview' | 'error';
    offerCatalog: PromotionSnapshot | null;
    offerVerifiedUntil: number;
    offerQuoteRevision: number;
    offerError: string;
    offerInputKey: string;
    hasAutomaticOffer: boolean;
    applyOfferQuote: (quote: Awaited<ReturnType<typeof merchandiseQuote>>) => void;
    setOfferCatalog: (catalog: PromotionSnapshot | null) => void;
    setOfferState: (status: 'idle' | 'loading' | 'ready' | 'preview' | 'error', error?: string) => void;

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

function quotedCart(quote: ReturnType<typeof evaluatePromotionSnapshot>) {
    const paid: CartItem[] = quote.items.map(i=>({...i,id:i.variantId,originalPrice:i.mrp}));
    const gifts: CartItem[] = quote.freeItems.map(g=>({id:`gift:${g.ruleId}`,variantId:`gift:${g.ruleId}`,
        inventoryVariantId:g.variantId || undefined,productId:g.productId || g.giftProductId || '',gift_product_ref_id:g.giftProductId || undefined,
        categoryId:'',name:g.name,variantTitle:'Gift',price:0,mrp:g.mrp,originalPrice:g.mrp,image:g.image,quantity:1,stock:1,is_gift:true,gift_rule_id:g.ruleId}));
    return {items:[...paid,...gifts],bxgyDiscounts:quote.discounts,giftProgress:quote.giftProgress,bxgyProgress:quote.bxgyProgress,
        hasAutomaticOffer:quote.hasAutomaticOffer,offerInputKey:paidCartKey(paid)};
}

// Runs synchronously inside each cart mutation, before subscribers render the new quantities.
function previewCart(items: CartItem[], catalog: PromotionSnapshot | null) {
    const paid = items.filter(i=>!i.is_gift&&!i.is_bxgy_free).map(i=>({...i,priceBreakdown:undefined}));
    if (catalog && paid.every(i=>i.brand !== undefined && i.categoryIds !== undefined)) {
        const quote = evaluatePromotionSnapshot(paid.map(i=>({...i,brand:i.brand!,categoryIds:i.categoryIds!})),catalog);
        return {...quotedCart(quote),offerStatus:'preview' as const,offerVerifiedUntil:0,offerError:''};
    }
    return {items:paid,bxgyDiscounts:[],giftProgress:[],bxgyProgress:[],hasAutomaticOffer:false,
        offerStatus:'idle' as const,offerVerifiedUntil:0,offerInputKey:'',offerError:''};
}

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            appliedPromo: null,
            bxgyDiscounts: [],
            giftProgress: [],
            bxgyProgress: [],
            offerStatus: 'idle', offerError: '', offerInputKey: '', hasAutomaticOffer: false,
            offerCatalog: null, offerVerifiedUntil: 0, offerQuoteRevision: 0,
            setOfferState: (status,error='') => set({offerStatus:status,offerError:error}),
            applyOfferQuote: (quote) => {
                set({...quotedCart(quote),offerCatalog:quote.previewCatalog || get().offerCatalog,
                    offerQuoteRevision:get().offerQuoteRevision+1,
                    appliedPromo:quote.hasAutomaticOffer?null:get().appliedPromo,offerStatus:'ready',offerError:'',offerVerifiedUntil:quote.expiresAt});
                get().autoCalculateShipping();
                get().autoRevalidatePromo();
            },
            setOfferCatalog: (catalog) => {
                const preview = previewCart(get().items,catalog);
                set({...preview,offerCatalog:catalog,appliedPromo:preview.hasAutomaticOffer?null:get().appliedPromo});
                get().autoCalculateShipping();
                get().autoRevalidatePromo();
            },
            shippingPrice: 0,
            baseShippingPrice: 0,
            shippingLabel: '',
            deliveryTimeLabel: '',
            selectedShippingId: null,
            shippingPincode: '',

            getSubtotal: () => {
                return roundMoney(get().items
                    .filter(item => !item.is_gift && !item.is_bxgy_free)
                    .reduce((acc, item) => acc + lineSubtotal(item), 0));
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
                    set({ items: updatedItems,offerStatus:'idle' });
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

                const preview = previewCart(updatedItems,get().offerCatalog);
                set({...preview,appliedPromo:preview.hasAutomaticOffer?null:get().appliedPromo});
                get().autoCalculateShipping();
                return { capped, maxQty };
            },

            updateQuantity: (variantId, quantity) => {
                const preview = previewCart(get().items.map(item =>
                        item.variantId === variantId
                            ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
                            : item
                    ),get().offerCatalog);
                set({...preview,appliedPromo:preview.hasAutomaticOffer?null:get().appliedPromo});
                get().autoCalculateShipping();
                get().autoRevalidatePromo();
            },

            removeItem: (variantId) => {
                const { items } = get();
                // Also remove any gift items linked to this product's gifts
                const remainingItems = items.filter(item => item.variantId !== variantId);
                // Remove gifts whose trigger product was removed ( gifts with gift_rule_id still in cart from other items remain)
                const preview = previewCart(remainingItems,get().offerCatalog);
                set({...preview,appliedPromo:preview.hasAutomaticOffer?null:get().appliedPromo});
                if (remainingItems.length === 0) get().clearShipping();
                else get().autoCalculateShipping();
                get().autoRevalidatePromo();
            },

            setItems: (newItems) => {
                const preview = previewCart(newItems,get().offerCatalog);
                set({...preview,appliedPromo:preview.hasAutomaticOffer?null:get().appliedPromo});
                get().autoCalculateShipping();
                get().autoRevalidatePromo();
            },

            setAppliedPromo: (promo) => set({ appliedPromo: get().hasAutomaticOffer ? null : promo }),

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
                appliedPromo: null,bxgyDiscounts:[],giftProgress:[],bxgyProgress:[],hasAutomaticOffer:false,offerStatus:'ready',offerInputKey:paidCartKey([]),offerError:'',offerVerifiedUntil:0,
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
                if (!appliedPromo || get().hasAutomaticOffer) return 0;

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

                discount=Math.min(discount,eligibleSubtotal,appliedPromo.max_discount_amount==null?Infinity:Number(appliedPromo.max_discount_amount));
                return roundMoney(discount);
            },

            getFinalTotal: () => {
                const subtotal = get().getSubtotal();
                const discount = get().getDiscountAmount();
                const bxgyDiscount = get().getBXGYTotalDiscount();
                const shipping = get().shippingPrice;
                return Math.max(0, roundMoney(subtotal - discount - bxgyDiscount + shipping));
            },

            totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
        }),
        {
            name: 'shopping-cart',
            storage: createJSONStorage(() => localStorage),
            version: 11,
            partialize: (state) => ({items:state.items.filter(i=>!i.is_gift&&!i.is_bxgy_free).map(i=>({...i,priceBreakdown:undefined})),appliedPromo:state.appliedPromo,
                shippingPrice:state.shippingPrice,baseShippingPrice:state.baseShippingPrice,shippingLabel:state.shippingLabel,
                deliveryTimeLabel:state.deliveryTimeLabel,selectedShippingId:state.selectedShippingId,shippingPincode:state.shippingPincode}),
            migrate: (persisted) => {
                const old=(persisted || {}) as Partial<CartStore>;
                return {...old,items:(old.items || []).filter(i=>!i.is_gift&&!i.is_bxgy_free).map(i=>({...i,priceBreakdown:undefined})),bxgyDiscounts:[],giftProgress:[],bxgyProgress:[],
                    hasAutomaticOffer:false,offerStatus:'idle' as const,offerInputKey:'',offerError:''};
            },
        }
    )
);

