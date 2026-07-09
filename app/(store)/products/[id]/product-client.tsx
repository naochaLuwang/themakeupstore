"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useCart } from "@/components/store/use-cart"
import { useRecentlyViewed } from "@/hooks/use-recently-viewed"
import { ProductCard } from "@/components/store/product-card"
import {
    Heart, ShoppingBag, Star, Share2, Store, MapPin,
    ShieldCheck, RotateCcw, ChevronDown, ChevronUp, ChevronRight, Check, X, Plus, Minus, Bell,
    ScanLine, Palette, Gift, Tag
} from "lucide-react"
import { toast } from "sonner"
import { submitStockNotification } from "@/app/actions/back-in-stock"
import VirtualTryOn from "@/components/store/virtual-try-on"
import FoundationShadeFinder from "@/components/store/foundation-shade-finder"
import { ReviewModal } from "@/components/store/review-modal"
import { ReviewCard } from "@/components/store/review-card"
import { useProductPromo } from "@/components/store/promotion-badge-context"

type SortOption = "newest" | "price_asc" | "price_desc" | "name"

function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<li>/gi, "\n• ")
        .replace(/<\/li>/gi, "")
        .replace(/<strong>/gi, "")
        .replace(/<\/strong>/gi, "")
        .replace(/<b>/gi, "")
        .replace(/<\/b>/gi, "")
        .replace(/<em>/gi, "")
        .replace(/<\/em>/gi, "")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

function getVariantPrice(variant: any, productDiscountType: string, productDiscountValue: number) {
    const base = variant.price || 0
    const dType = variant.discount_type && variant.discount_type !== "none" ? variant.discount_type : productDiscountType
    const dVal = variant.discount_value || productDiscountValue || 0
    let salePrice = base
    if (dType === "percentage" && dVal > 0) salePrice = base * (1 - dVal / 100)
    else if ((dType === "fixed" || dType === "amount") && dVal > 0) salePrice = Math.max(0, base - dVal)
    return { salePrice, mrp: variant.mrp || variant.price || base }
}

function calculateDiscountPercentage(finalPrice: number, originalPrice: number): number {
    if (originalPrice <= 0) return 0
    return Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
}

export default function ProductClient({ initialProduct, activeBXGY, activeGift }: { initialProduct: any; activeBXGY?: any; activeGift?: any }) {
    const router = useRouter()
    const supabase = createClient()
    const addItem = useCart((s) => s.addItem)
    const addToRecentlyViewed = useRecentlyViewed((s) => s.addItem)

    // Use context as fallback when server-side query fails
    const productCategoryIds = [
        ...(initialProduct.category_id ? [initialProduct.category_id] : []),
        ...(initialProduct.product_categories || []).map((pc: any) => pc.category_id).filter(Boolean)
    ]
    const { activePromo } = useProductPromo(initialProduct.id, initialProduct.category_id, initialProduct.brand, productCategoryIds)
    const resolvedBXGY = activeBXGY || (activePromo?.type === 'bogo' ? { name: activePromo.ruleName, buy_quantity: 2 } : null)
    const resolvedGift = activeGift || (activePromo?.type === 'gift' ? {
        name: activePromo.ruleName,
        min_cart_amount: activePromo.minCartAmount,
        gift_product: activePromo.giftProduct,
        gift_quantity: activePromo.giftQuantity || 1,
    } : null)

    const cartItems = useCart((s) => s.items)
    const cartSubtotal = useMemo(() => cartItems.filter((i: any) => !i.is_gift && !i.is_bxgy_free).reduce((s: number, i: any) => s + i.price * i.quantity, 0), [cartItems])
    const giftQualified = useMemo(() => {
        if (!resolvedGift?.min_cart_amount) return true
        return cartSubtotal >= resolvedGift.min_cart_amount
    }, [resolvedGift?.min_cart_amount, cartSubtotal])
    const giftRemaining = useMemo(() => {
        if (!resolvedGift?.min_cart_amount) return 0
        return Math.max(0, resolvedGift.min_cart_amount - cartSubtotal)
    }, [resolvedGift?.min_cart_amount, cartSubtotal])

    const [product, setProduct] = useState(initialProduct)
    const [activeImage, setActiveImage] = useState(0)
    const [selectedVariant, setSelectedVariant] = useState<any>(null)
    const [selectedVariantData, setSelectedVariantData] = useState<any>(null)
    const [descExpanded, setDescExpanded] = useState(false)
    const [variantModalVisible, setVariantModalVisible] = useState(false)
    const [showAddedToast, setShowAddedToast] = useState(false)
    const [notifyModalVisible, setNotifyModalVisible] = useState(false)
    const [tryOnOpen, setTryOnOpen] = useState(false)
    const [shadeFinderOpen, setShadeFinderOpen] = useState(false)
    const [similarProducts, setSimilarProducts] = useState<any[]>([])
    const [brandProducts, setBrandProducts] = useState<any[]>([])
    const [reviewsModalVisible, setReviewsModalVisible] = useState(false)

    const productReviews = initialProduct.product_reviews || []
    const initialAvgRating = productReviews.length > 0
        ? Math.round(productReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / productReviews.length * 10) / 10
        : 0

    const [averageRating, setAverageRating] = useState(initialAvgRating)
    const [totalReviews, setTotalReviews] = useState(productReviews.length)
    const [isWishlisted, setIsWishlisted] = useState(false)
    const [wishlistLoading, setWishlistLoading] = useState(false)
    const [user, setUser] = useState<any>(null)

    const scrollRef = useRef<HTMLDivElement>(null)
    const imageContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        addToRecentlyViewed({
            id: initialProduct.id, name: initialProduct.name, slug: initialProduct.slug,
            base_price: initialProduct.base_price, thumbnail_url: initialProduct.thumbnail_url,
            brand: initialProduct.brand, discount_type: initialProduct.discount_type,
            discount_value: initialProduct.discount_value, has_variants: initialProduct.has_variants,
            status: initialProduct.status, product_variants: initialProduct.product_variants || [],
        })

        const init = async () => {
            try {
                const { data: { user: u } } = await supabase.auth.getUser()
                setUser(u)

                if (u) {
                    const { data: wl } = await supabase
                        .from("wishlist")
                        .select("id")
                        .eq("user_id", u.id)
                        .eq("product_id", initialProduct.id)
                        .single()
                    if (wl) setIsWishlisted(true)
                }

                const similarCatIds = new Set<string>()
                if (initialProduct.product_categories?.length > 0) {
                    initialProduct.product_categories.forEach((pc: any) => {
                        if (pc.category_id) similarCatIds.add(pc.category_id)
                    })
                }
                if (initialProduct.category_id) similarCatIds.add(initialProduct.category_id)

                if (similarCatIds.size > 0) {
                    const { data: catInfo } = await supabase
                        .from("categories")
                        .select("id, parent_id")
                        .in("id", Array.from(similarCatIds))
                    const subCats = (catInfo || []).filter((c: any) => c.parent_id)
                    const parentCats = (catInfo || []).filter((c: any) => !c.parent_id)
                    let targetCatIds: string[]
                    if (subCats.length > 0) {
                        targetCatIds = subCats.map((c: any) => c.id)
                    } else {
                        targetCatIds = parentCats.map((c: any) => c.id)
                        const { data: children } = await supabase
                            .from("categories")
                            .select("id")
                            .in("parent_id", targetCatIds)
                        if (children?.length) children.forEach((c: any) => targetCatIds.push(c.id))
                    }
                    targetCatIds = [...new Set(targetCatIds)]
                    const { data: catProducts } = await supabase
                        .from("product_categories")
                        .select("product_id")
                        .in("category_id", targetCatIds)
                        .neq("product_id", initialProduct.id)
                        .limit(15)
                    if (catProducts && catProducts.length > 0) {
                        const ids = [...new Set(catProducts.map((c: any) => c.product_id))]
                        const { data: similar } = await supabase
                            .from("products")
                            .select("id, name, slug, base_price, thumbnail_url, brand, category_id, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, discount_type, discount_value, hex_code, title, image_url)")
                            .in("id", ids)
                            .limit(10)
                        if (similar) setSimilarProducts(similar.filter((p: any) => p.thumbnail_url))
                    }
                }

                if (initialProduct.brand) {
                    const { data: brandData } = await supabase
                        .from("products")
                        .select("id, name, slug, base_price, thumbnail_url, brand, category_id, discount_type, discount_value, has_variants, status, product_variants(id, price, stock, discount_type, discount_value, hex_code, title, image_url)")
                        .eq("brand", initialProduct.brand)
                        .neq("id", initialProduct.id)
                        .limit(10)
                    if (brandData) setBrandProducts(brandData)
                }
            } catch (e) {
                console.error("Failed to initialize product page", e)
            }
        }
        init()
    }, [])

    useEffect(() => {
        if (product?.product_variants?.length > 0) {
            const first = product.product_variants.find((v: any) => v.stock > 0) || product.product_variants[0]
            const vp = getVariantPrice(first, product.discount_type || "none", product.discount_value || 0)
            const variantImages = (first.variant_images || [])
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                .map((vi: any) => vi.url)
                .filter(Boolean)
            setSelectedVariant(first.id)
            setSelectedVariantData({
                id: first.id,
                title: first.title,
                price: first.price,
                calculated_price: vp.salePrice,
                image_url: first.image_url || null,
                stock: first.stock,
                hex_code: first.hex_code,
                images: variantImages.length > 0 ? variantImages : (first.image_url ? [first.image_url] : []),
            })
        }
    }, [product?.product_variants])

    useEffect(() => {
        setActiveImage(0)
        if (scrollRef.current) scrollRef.current.scrollLeft = 0
    }, [selectedVariant])

    const lipSlugs = new Set(["lips", "lipstick", "lip-liner", "liquid-lipstick", "lip-gloss", "lip-balm", "lip-tint"])
    const isLipProduct = useMemo(() => {
        if (!product?.product_categories) return false
        return product.product_categories.some((pc: any) => lipSlugs.has(pc.category?.slug))
    }, [product])

    const foundationSlugs = new Set(["foundation"])
    const isFoundationProduct = useMemo(() => {
        if (!product?.product_categories) return false
        return product.product_categories.some((pc: any) => foundationSlugs.has(pc.category?.slug))
    }, [product])

    const sellingPrice = useMemo(() => {
        if (!product) return 0
        let price = product.base_price || 0
        if (product.has_variants && product.product_variants?.length > 0) {
            const prices = product.product_variants.map((v: any) => v.price).filter((p: number) => p > 0)
            if (prices.length > 0) price = Math.min(...prices)
        }
        return price
    }, [product])

    const discountType = product?.discount_type || "none"
    const discountValue = product?.discount_value || 0
    const finalPrice = selectedVariantData
        ? selectedVariantData.calculated_price
        : (calculateDiscountPercentage(0, 0) > 0 ? 0 : sellingPrice)
    const discountPct = calculateDiscountPercentage(
        selectedVariantData?.calculated_price || sellingPrice,
        sellingPrice
    )

    const hasVariants = product?.has_variants && product?.product_variants?.length > 0
    const selectedVariantOOS = selectedVariantData?.stock != null && Number(selectedVariantData.stock) <= 0
    const productIsOutOfStock = product?.product_variants && product.product_variants.length > 0
        ? product.product_variants!.every((v: any) => v.stock != null && Number(v.stock) <= 0)
        : (product?.stock != null && Number(product.stock) <= 0)
    const showOOSButton = productIsOutOfStock || (hasVariants && selectedVariant && selectedVariantOOS)

    const imageList = selectedVariantData?.images?.length
        ? selectedVariantData.images
        : selectedVariantData?.image_url
            ? [selectedVariantData.image_url]
            : product?.image_urls?.length
                ? product.image_urls
                : product?.thumbnail_url
                    ? [product.thumbnail_url]
                    : []

    const handleNotifyMe = async (e: React.FormEvent) => {
        e.preventDefault()
        const formElement = e.target as HTMLFormElement
        const formData = new FormData(formElement)
        const res = await submitStockNotification({
            userName: formData.get("name") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            productId: product.id,
            variantId: selectedVariant || product.id,
        })
        if (res.success) {
            toast.success("Notification set! We'll alert you once it's restocked.")
            formElement.reset()
            setNotifyModalVisible(false)
        } else {
            toast.error(res.error || "Something went wrong")
        }
    }

    const handleAddToBag = () => {
        if (hasVariants && !selectedVariant) return
        if (selectedVariantData?.stock === 0) return

        const result = addItem({
            id: selectedVariant || product.id,
            productId: product.id,
            variantId: selectedVariant || product.id,
            name: product.name,
            price: selectedVariantData?.calculated_price || selectedVariantData?.price || product.base_price || 0,
            mrp: product.base_price || 0,
            originalPrice: selectedVariantData?.price || product.base_price || 0,
            image: selectedVariantData?.image_url || product.thumbnail_url,
            quantity: 1,
            variantTitle: selectedVariantData?.title || "Standard",
            categoryId: product.category_id,
            stock: selectedVariantData?.stock || 0,
        })
        if (result?.capped) {
            toast.info(`Only ${result.maxQty} in stock — quantity capped`)
        }
        setShowAddedToast(true)
        setTimeout(() => setShowAddedToast(false), 2000)
    }

    const toggleWishlist = async () => {
        if (wishlistLoading) return
        if (!user) { router.push("/login"); return }
        const prev = isWishlisted
        setIsWishlisted(!prev)
        setWishlistLoading(true)
        try {
            if (prev) {
                await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", product.id)
            } else {
                await supabase.from("wishlist").insert({ user_id: user.id, product_id: product.id })
            }
            window.dispatchEvent(new CustomEvent("wishlist-updated"))
        } catch {
            setIsWishlisted(prev)
        } finally { setWishlistLoading(false) }
    }

    const handleImageScroll = useCallback(() => {
        if (imageContainerRef.current) {
            const scrollLeft = imageContainerRef.current.scrollLeft
            const width = imageContainerRef.current.clientWidth
            const index = Math.round(scrollLeft / width)
            setActiveImage(index)
        }
    }, [])

    const [pincode, setPincode] = useState("")
    const [deliveryChecking, setDeliveryChecking] = useState(false)
    const [deliveryStatus, setDeliveryStatus] = useState<"idle" | "available" | "unavailable">("idle")
    const [deliveryLabel, setDeliveryLabel] = useState("")
    const [showPincodeInput, setShowPincodeInput] = useState(false)

    const checkDelivery = async (prefillPin?: string) => {
        const clean = (prefillPin || pincode).trim()
        if (clean.length !== 6 || !/^\d{6}$/.test(clean)) return
        setDeliveryChecking(true)
        setDeliveryStatus("idle")
        try {
            const { data: zone } = await supabase
                .from("shipping_zones")
                .select("id")
                .eq("pincode", clean)
                .maybeSingle()
            if (!zone) {
                setDeliveryStatus("unavailable")
                setDeliveryChecking(false)
                return
            }
            const { data: methods } = await supabase
                .from("shipping_methods")
                .select("delivery_time_label")
                .eq("zone_id", zone.id)
                .eq("is_active", true)
                .order("price", { ascending: true })
                .limit(1)
            if (methods && methods.length > 0) {
                setDeliveryStatus("available")
                setDeliveryLabel(methods[0].delivery_time_label)
            } else {
                setDeliveryStatus("unavailable")
            }
        } catch {
            setDeliveryStatus("unavailable")
        }
        setShowPincodeInput(false)
        setDeliveryChecking(false)
    }

    const getDeliveryLine = () => {
        if (!deliveryLabel || !pincode) return ""
        const opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }
        if (/FRI\/SAT/i.test(deliveryLabel)) {
            const d = new Date()
            const currentDay = d.getDay()
            let diff = 6 - currentDay
            if (diff <= 0) diff += 7
            d.setDate(d.getDate() + diff)
            return `Delivery by ${d.toLocaleDateString("en-IN", opts)}`
        }
        const match = deliveryLabel.match(/(\d+)\s*-\s*\d+/)
        if (match) {
            const days = parseInt(match[1], 10)
            const date = new Date()
            date.setDate(date.getDate() + days)
            return `Delivery by ${date.toLocaleDateString("en-IN", opts)}`
        }
        return `Delivery by ${deliveryLabel}`
    }

    useEffect(() => {
        if (!user?.id) return
        ;(async () => {
            const { data: addr } = await supabase
                .from("user_addresses")
                .select("pincode")
                .eq("user_id", user.id)
                .order("is_default", { ascending: false })
                .limit(1)
                .maybeSingle()
            if (addr?.pincode) {
                setPincode(addr.pincode)
                checkDelivery(addr.pincode)
            }
        })()
    }, [user?.id])

    return (
        <div className="min-h-screen bg-white">
            {/* Mobile Layout */}
            <div className="md:hidden pb-24">
            {/* Image Gallery */}
            <div className="relative w-full bg-[#fafafa]">
                <div
                    ref={imageContainerRef}
                    onScroll={handleImageScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
                >
                    {imageList.length > 1 ? (
                        imageList.map((img: string, i: number) => (
                            <div key={i} className="w-full shrink-0 snap-center">
                                <div className="relative w-full" style={{ aspectRatio: "1 / 0.85" }}>
                                    <img
                                        src={img}
                                        alt={`${product.name} ${i + 1}`}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="w-full shrink-0">
                            <div className="relative w-full" style={{ aspectRatio: "1 / 0.85" }}>
                                <img
                                    src={imageList[0] || "/placeholder.png"}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>
                    )}
                </div>
                {discountPct > 0 && (
                    <div className="absolute top-4 left-0 bg-[#fc2779] text-white text-[11px] font-black px-2.5 py-1 rounded-r-sm tracking-wider">
                        {discountPct}% OFF
                    </div>
                )}
                {(isLipProduct || isFoundationProduct) && (
                    <button
                        onClick={() => isLipProduct ? setTryOnOpen(true) : setShadeFinderOpen(true)}
                        className="absolute top-4 right-4 w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-lg border border-white/30 flex flex-col items-center justify-center gap-0.5 shadow-lg hover:bg-black/60 active:scale-95 transition-all"
                    >
                        {isLipProduct ? <ScanLine className="w-5 h-5 text-white" /> : <Palette className="w-5 h-5 text-white" />}
                        <span className="text-[7px] text-white/90 font-black uppercase tracking-wider">{isLipProduct ? "Try On" : "Match"}</span>
                    </button>
                )}
            </div>
            {imageList.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                    {imageList.map((_: string, i: number) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${activeImage === i ? "w-5 bg-[#fc2779]" : "w-1.5 bg-gray-300"}`}
                        />
                    ))}
                </div>
            )}

            {/* Product Info */}
            <div className="px-4 pt-4">
                {product.brand && (
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">{product.brand}</p>
                )}
                <h1 className="text-lg font-normal text-gray-900 mt-1 leading-snug">{product.name}</h1>

                {averageRating > 0 && (
                    <button onClick={() => setReviewsModalVisible(true)} className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-green-700 text-white px-1.5 py-0.5 rounded text-[11px] font-bold">
                            <span>{averageRating.toFixed(1)}</span>
                            <Star className="w-3 h-3 fill-white" />
                        </div>
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                    key={s}
                                    className={`w-3 h-3 ${s <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-400">{totalReviews} Reviews</span>
                    </button>
                )}
            </div>

            {/* Pricing */}
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-black text-gray-900">
                            ₹{Math.round(selectedVariantData?.calculated_price || finalPrice || sellingPrice)}
                        </span>
                        {discountPct > 0 && (
                            <>
                                <span className="text-sm text-gray-400 line-through">₹{Math.round(sellingPrice)}</span>
                                <span className="text-[11px] font-bold text-[#fc2779] bg-[#fc2779]/10 px-2 py-0.5 rounded">{discountPct}% off</span>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => { /* share */ }}
                        className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center"
                    >
                        <Share2 className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">inclusive of all taxes</p>
            </div>

            {/* Variant Selector */}
            {hasVariants && (
                <div className="px-4 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-900">{selectedVariantData?.title || "Select Shade"}</span>
                        <button onClick={() => setVariantModalVisible(true)} className="flex items-center gap-0.5 text-[#fc2779] text-xs font-semibold">
                            View All <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {product.product_variants.map((v: any) => {
                            const isSelected = selectedVariant === v.id
                            const isOOS = v.stock != null && Number(v.stock) <= 0
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => {
                                        const vp = getVariantPrice(v, discountType, discountValue)
                                        const variantImages = (v.variant_images || [])
                                            .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                                            .map((vi: any) => vi.url)
                                            .filter(Boolean)
                                        setSelectedVariant(v.id)
                                        setSelectedVariantData({
                                            id: v.id, title: v.title, price: v.price,
                                            calculated_price: vp.salePrice, image_url: v.image_url || null,
                                            stock: v.stock, hex_code: v.hex_code,
                                            images: variantImages.length > 0 ? variantImages : (v.image_url ? [v.image_url] : []),
                                        })
                                    }}
                                    className="flex flex-col items-center gap-1 shrink-0"
                                >
                                    <div className="relative">
                                        <div
                                            className={`w-11 h-11 rounded border-2 overflow-hidden ${isSelected ? "border-[#fc2779]" : "border-transparent"}`}
                                        >
                                            <div
                                                className="w-full h-full rounded-sm"
                                                style={{ backgroundColor: v.hex_code || "#f1f1f1" }}
                                            />
                                        </div>
                                        {isOOS && (
                                            <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded">
                                                <span className="text-[7px] font-black text-white uppercase tracking-wider">OOS</span>
                                            </div>
                                        )}
                                    </div>
                                    {v.title && (
                                        <span className={`text-[9px] font-medium text-center max-w-[60px] truncate ${isSelected ? "text-[#fc2779]" : "text-gray-500"}`}>
                                            {v.title}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Promotion Callout — above Sold By */}
            {(resolvedBXGY || resolvedGift) && (
                <div className="px-4 space-y-2 py-3">
                    {resolvedBXGY && (
                        <div className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl bg-white">
                            <div className="relative shrink-0">
                                {resolvedBXGY.get_product?.thumbnail_url ? (
                                    <img src={resolvedBXGY.get_product.thumbnail_url} alt={resolvedBXGY.get_product.name} className="w-16 h-16 rounded-lg object-cover border border-slate-100" />
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-pink-100 flex items-center justify-center">
                                        <Tag className="w-6 h-6 text-[#fc2779]" />
                                    </div>
                                )}
                                <span className="absolute -top-1.5 -right-1.5 bg-[#fc2779] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">BOGO</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{resolvedBXGY.get_product?.name || resolvedBXGY.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Buy {resolvedBXGY.buy_quantity} Get Y Free</p>
                            </div>
                        </div>
                    )}
                    {resolvedGift && (
                        <div className={`flex items-center gap-4 p-3 border rounded-xl ${giftQualified ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/50'}`}>
                            <div className="relative shrink-0">
                                {resolvedGift.gift_product?.thumbnail_url ? (
                                    <img src={resolvedGift.gift_product.thumbnail_url} alt={resolvedGift.gift_product.name} className={`w-16 h-16 rounded-lg object-cover border shrink-0 ${giftQualified ? 'border-slate-100' : 'border-slate-100 opacity-50'}`} />
                                ) : (
                                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${giftQualified ? 'bg-purple-100' : 'bg-slate-100'}`}>
                                        <Gift className={`w-6 h-6 ${giftQualified ? 'text-purple-400' : 'text-slate-300'}`} />
                                    </div>
                                )}
                                <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${giftQualified ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    {giftQualified ? 'FREE' : 'GIFT'}
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`text-sm font-semibold truncate ${giftQualified ? 'text-gray-900' : 'text-slate-400'}`}>
                                    {resolvedGift.gift_product?.name || resolvedGift.name}
                                </p>
                                <p className={`text-xs mt-0.5 ${giftQualified ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {giftQualified ? 'Free Gift with Purchase' : `Add ₹${giftRemaining.toLocaleString()} more to get free gift`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sold By */}
            <div className="px-4 py-2.5 flex items-center gap-1.5 border-b border-gray-100">
                <Store className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                    Sold by: <span className="font-bold text-gray-800">THE MAKEUPSTORE WANGKHEI</span>
                </span>
            </div>

            {/* Pincode Checker */}
            <div className="mx-4 mt-3 border border-gray-200 rounded-lg bg-gray-50 p-3">
                {deliveryStatus === "idle" || showPincodeInput ? (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Enter delivery pincode"
                            value={pincode}
                            onChange={(e) => { setPincode(e.target.value); setDeliveryStatus("idle") }}
                            maxLength={6}
                            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                        />
                        <button
                            onClick={() => checkDelivery()}
                            disabled={deliveryChecking}
                            className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-md disabled:opacity-50"
                        >
                            {deliveryChecking ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : "Check"}
                        </button>
                    </div>
                ) : deliveryStatus === "available" ? (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-500 shrink-0" />
<span className="flex-1 text-xs text-green-600 font-semibold">
    {getDeliveryLine()}
</span>
                        <button onClick={() => setShowPincodeInput(true)} className="text-[#fc2779] text-xs font-bold">Change</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="flex-1 text-xs text-red-500 font-semibold">
                            Not deliverable to {pincode}
                        </span>
                        <button onClick={() => setShowPincodeInput(true)} className="text-[#fc2779] text-xs font-bold">Change</button>
                    </div>
                )}
            </div>

            {/* Features */}
            <div className="flex gap-3 px-4 py-3 border-b border-gray-100">
                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="text-[11px] font-semibold text-gray-700">100% Authentic</span>
                </div>
                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5">
                    <RotateCcw className="w-4 h-4 text-green-500" />
                    <span className="text-[11px] font-semibold text-gray-700">Easy Returns</span>
                </div>
            </div>

            {/* Product Details */}
            {product.description && (
                <div className="px-4 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Product Details</h3>
                    <p className={`text-sm text-gray-600 leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}>
                        {stripHtml(product.description)}
                    </p>
                    <button
                        onClick={() => setDescExpanded(!descExpanded)}
                        className="flex items-center gap-1 mt-2 text-[#fc2779] text-xs font-semibold"
                    >
                        {descExpanded ? "Show Less" : "Read More"}
                        {descExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>
            )}

            {/* Reviews Section */}
            <div className="mx-4 my-4 border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Customer Reviews</h3>
                    <button onClick={() => setReviewsModalVisible(true)} className="text-[#fc2779] text-xs font-semibold">View All</button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-center min-w-[60px]">
                        <span className="text-2xl font-black text-gray-900">{averageRating > 0 ? averageRating.toFixed(1) : "-"}</span>
                        <p className="text-[10px] text-gray-400">{totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}</p>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                    key={s}
                                    className={`w-4 h-4 ${s <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                                />
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={() => setReviewsModalVisible(true)}
                        className="border border-[#fc2779] rounded-lg px-3 py-2 flex items-center gap-1 shrink-0"
                    >
                        <Star className="w-3.5 h-3.5 text-[#fc2779]" />
                        <span className="text-[11px] font-bold text-[#fc2779]">Write</span>
                    </button>
                </div>

                {product.product_reviews && product.product_reviews.length > 0 && (
                    <div className="mt-4">
                        {product.product_reviews.slice(0, 2).map((r: any) => (
                            <ReviewCard key={r.id} review={r} />
                        ))}
                        {product.product_reviews.length > 2 && (
                            <button
                                onClick={() => setReviewsModalVisible(true)}
                                className="w-full text-center py-3 text-[#fc2779] text-xs font-semibold flex items-center justify-center gap-1"
                            >
                                View All {totalReviews} Reviews
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {(!product.product_reviews || product.product_reviews.length === 0) && (
                    <button onClick={() => setReviewsModalVisible(true)} className="w-full text-center py-4 text-xs text-gray-400 mt-2">
                        Be the first to review this product
                    </button>
                )}
            </div>

            {/* Similar Products */}
            {similarProducts.length > 0 && (
                <div className="py-4">
                    <h3 className="text-sm font-semibold text-gray-900 px-4 mb-3">Similar Products</h3>
                    <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
                        {similarProducts.map((item: any) => (
                            <div key={item.id} className="w-40 shrink-0">
                                <ProductCard product={item} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* More from this brand */}
            {brandProducts.length > 0 && product.brand && (
                <div className="py-4">
                    <h3 className="text-sm font-semibold text-gray-900 px-4 mb-3">
                        More from <span className="text-[#fc2779]">{product.brand}</span>
                    </h3>
                    <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
                        {brandProducts.map((item: any) => (
                            <div key={item.id} className="w-40 shrink-0">
                                <ProductCard product={item} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-5 flex items-center gap-3 shadow-lg z-40">
                <button
                    onClick={toggleWishlist}
                    className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0"
                >
                    <Heart
                        className={`w-5 h-5 ${isWishlisted ? "fill-[#fc2779] text-[#fc2779]" : "text-gray-600"}`}
                    />
                </button>
                {showOOSButton ? (
                    <button onClick={() => setNotifyModalVisible(true)} className="flex-1 h-12 rounded-full bg-[#fc2779] text-white text-sm font-semibold flex items-center justify-center gap-2">
                        <Bell className="w-4 h-4" />
                        Notify Me
                    </button>
                ) : (
                    <button
                        onClick={handleAddToBag}
                        className="flex-1 h-12 rounded-full bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        Add to Bag
                    </button>
                )}
            </div>

            {/* Added toast */}
            {showAddedToast && (
                <div className="fixed bottom-24 md:bottom-4 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-semibold py-3 px-5 rounded-lg flex items-center justify-center gap-2 shadow-xl">
                    <Check className="w-4 h-4" />
                    Added to bag
                </div>
            )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block">
                <div className="max-w-7xl mx-auto px-8 py-8">
                    <div className="grid grid-cols-2 gap-12">
                        {/* Left: Image Gallery */}
                        <div>
                            <div className="relative w-full bg-[#fafafa] rounded-2xl overflow-hidden" style={{ aspectRatio: "1 / 0.85" }}>
                                <img
                                    src={imageList[activeImage] || imageList[0] || "/placeholder.png"}
                                    alt={product?.name}
                                    className="w-full h-full object-contain"
                                />
                                {discountPct > 0 && (
                                    <div className="absolute top-4 left-0 bg-[#fc2779] text-white text-xs font-black px-3 py-1.5 rounded-r-sm tracking-wider">
                                        {discountPct}% OFF
                                    </div>
                                )}
                                {(isLipProduct || isFoundationProduct) && (
                                    <button
                                        onClick={() => isLipProduct ? setTryOnOpen(true) : setShadeFinderOpen(true)}
                                        className="absolute top-4 right-4 w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-lg border border-white/30 flex flex-col items-center justify-center gap-0.5 shadow-lg hover:bg-black/60 active:scale-95 transition-all"
                                    >
                                        {isLipProduct ? <ScanLine className="w-5 h-5 text-white" /> : <Palette className="w-5 h-5 text-white" />}
                                        <span className="text-[7px] text-white/90 font-black uppercase tracking-wider">{isLipProduct ? "Try On" : "Match"}</span>
                                    </button>
                                )}
                            </div>
                            {imageList.length > 1 && (
                                <div className="flex gap-2 mt-4">
                                    {imageList.map((img: string, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => setActiveImage(i)}
                                            className={`w-16 h-16 rounded-lg border-2 overflow-hidden shrink-0 ${
                                                activeImage === i ? "border-[#fc2779]" : "border-gray-200"
                                            }`}
                                        >
                                            <img src={img} alt="Review photo" className="w-full h-full object-cover" loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Product Info & Actions */}
                        <div className="flex flex-col gap-5">
                            {product?.brand && (
                                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">{product.brand}</p>
                            )}
                            <h1 className="text-2xl font-normal text-gray-900 leading-snug">{product?.name}</h1>

                            {averageRating > 0 && (
                                <button onClick={() => setReviewsModalVisible(true)} className="flex items-center gap-2 w-fit">
                                    <div className="flex items-center gap-1 bg-green-700 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                                        <span>{averageRating.toFixed(1)}</span>
                                        <Star className="w-3 h-3 fill-white" />
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`w-3.5 h-3.5 ${s <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-sm text-gray-400">{totalReviews} Reviews</span>
                                </button>
                            )}

                            {/* Pricing */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-2xl font-black text-gray-900">
                                    ₹{Math.round(selectedVariantData?.calculated_price || finalPrice || sellingPrice)}
                                </span>
                                {discountPct > 0 && (
                                    <>
                                        <span className="text-base text-gray-400 line-through">₹{Math.round(sellingPrice)}</span>
                                        <span className="text-xs font-bold text-[#fc2779] bg-[#fc2779]/10 px-2.5 py-0.5 rounded">{discountPct}% off</span>
                                    </>
                                )}
                                <p className="text-xs text-gray-400 w-full">inclusive of all taxes</p>
                            </div>

                            {/* Variant Selector */}
                            {hasVariants && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-gray-900">{selectedVariantData?.title || "Select Shade"}</span>
                                        <button onClick={() => setVariantModalVisible(true)} className="flex items-center gap-0.5 text-[#fc2779] text-xs font-semibold">
                                            View All <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex gap-3">
                                        {product?.product_variants?.map((v: any) => {
                                            const isSelected = selectedVariant === v.id
                                            const isOOS = v.stock != null && Number(v.stock) <= 0
                                            return (
                                                <button
                                                    key={v.id}
                                                    onClick={() => {
                                                        const vp = getVariantPrice(v, discountType, discountValue)
                                                        const variantImages = (v.variant_images || [])
                                                            .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                                                            .map((vi: any) => vi.url)
                                                            .filter(Boolean)
                                                        setSelectedVariant(v.id)
                                                        setSelectedVariantData({
                                                            id: v.id, title: v.title, price: v.price,
                                                            calculated_price: vp.salePrice, image_url: v.image_url || null,
                                                            stock: v.stock, hex_code: v.hex_code,
                                                            images: variantImages.length > 0 ? variantImages : (v.image_url ? [v.image_url] : []),
                                                        })
                                                    }}
                                                    className="flex flex-col items-center gap-1 shrink-0"
                                                >
                                                    <div className="relative">
                                                        <div
                                                            className={`w-12 h-12 rounded border-2 overflow-hidden ${isSelected ? "border-[#fc2779]" : "border-transparent"}`}
                                                        >
                                                            <div
                                                                className="w-full h-full rounded-sm"
                                                                style={{ backgroundColor: v.hex_code || "#f1f1f1" }}
                                                            />
                                                        </div>
                                                        {isOOS && (
                                                            <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded">
                                                                <span className="text-[7px] font-black text-white uppercase tracking-wider">OOS</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {v.title && (
                                                        <span className={`text-[10px] font-medium text-center max-w-[60px] truncate ${isSelected ? "text-[#fc2779]" : "text-gray-500"}`}>
                                                            {v.title}
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Promotion Callout — above Sold By */}
                            {(resolvedBXGY || resolvedGift) && (
                                <div className="space-y-2">
                                    {resolvedBXGY && (
                                        <div className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl bg-white">
                                            <div className="relative shrink-0">
                                                {resolvedBXGY.get_product?.thumbnail_url ? (
                                                    <img src={resolvedBXGY.get_product.thumbnail_url} alt={resolvedBXGY.get_product.name} className="w-16 h-16 rounded-lg object-cover border border-slate-100" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-lg bg-pink-100 flex items-center justify-center">
                                                        <Tag className="w-6 h-6 text-[#fc2779]" />
                                                    </div>
                                                )}
                                                <span className="absolute -top-1.5 -right-1.5 bg-[#fc2779] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">BOGO</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{resolvedBXGY.get_product?.name || resolvedBXGY.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Buy {resolvedBXGY.buy_quantity} Get Y Free</p>
                                            </div>
                                        </div>
                                    )}
                                    {resolvedGift && (
                                        <div className={`flex items-center gap-4 p-3 border rounded-xl ${giftQualified ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/50'}`}>
                                            <div className="relative shrink-0">
                                                {resolvedGift.gift_product?.thumbnail_url ? (
                                                    <img src={resolvedGift.gift_product.thumbnail_url} alt={resolvedGift.gift_product.name} className={`w-16 h-16 rounded-lg object-cover border shrink-0 ${giftQualified ? 'border-slate-100' : 'border-slate-100 opacity-50'}`} />
                                                ) : (
                                                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${giftQualified ? 'bg-purple-100' : 'bg-slate-100'}`}>
                                                        <Gift className={`w-6 h-6 ${giftQualified ? 'text-purple-400' : 'text-slate-300'}`} />
                                                    </div>
                                                )}
                                                <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${giftQualified ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                    {giftQualified ? 'FREE' : 'GIFT'}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-semibold truncate ${giftQualified ? 'text-gray-900' : 'text-slate-400'}`}>
                                                    {resolvedGift.gift_product?.name || resolvedGift.name}
                                                </p>
                                                <p className={`text-xs mt-0.5 ${giftQualified ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {giftQualified ? 'Free Gift with Purchase' : `Add ₹${giftRemaining.toLocaleString()} more to get free gift`}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Sold By */}
                            <div className="flex items-center gap-1.5">
                                <Store className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                    Sold by: <span className="font-bold text-gray-800">THE MAKEUPSTORE WANGKHEI</span>
                                </span>
                            </div>

                            {/* Pincode Checker */}
                            <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
                                {deliveryStatus === "idle" || showPincodeInput ? (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Enter delivery pincode"
                                            value={pincode}
                                            onChange={(e) => { setPincode(e.target.value); setDeliveryStatus("idle") }}
                                            maxLength={6}
                                            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                                        />
                                        <button
                                            onClick={() => checkDelivery()}
                                            disabled={deliveryChecking}
                                            className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-md disabled:opacity-50"
                                        >
                                            {deliveryChecking ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : "Check"}
                                        </button>
                                    </div>
                                ) : deliveryStatus === "available" ? (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-green-500 shrink-0" />
<span className="flex-1 text-xs text-green-600 font-semibold">
    {getDeliveryLine()}
</span>
                                        <button onClick={() => setShowPincodeInput(true)} className="text-[#fc2779] text-xs font-bold">Change</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                                        <span className="flex-1 text-xs text-red-500 font-semibold">
                                            Not deliverable to {pincode}
                                        </span>
                                        <button onClick={() => setShowPincodeInput(true)} className="text-[#fc2779] text-xs font-bold">Change</button>
                                    </div>
                                )}
                            </div>

                            {/* Features */}
                            <div className="flex gap-3">
                                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    <span className="text-xs font-semibold text-gray-700">100% Authentic</span>
                                </div>
                                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5">
                                    <RotateCcw className="w-4 h-4 text-green-500" />
                                    <span className="text-xs font-semibold text-gray-700">Easy Returns</span>
                                </div>
                            </div>


                            {/* Description */}
                            {product?.description && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Product Details</h3>
                                    <p className={`text-sm text-gray-600 leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}>
                                        {stripHtml(product.description)}
                                    </p>
                                    <button
                                        onClick={() => setDescExpanded(!descExpanded)}
                                        className="flex items-center gap-1 mt-2 text-[#fc2779] text-xs font-semibold"
                                    >
                                        {descExpanded ? "Show Less" : "Read More"}
                                        {descExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            )}

                            {/* CTA Buttons */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={toggleWishlist}
                                    className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 hover:border-gray-400 transition-colors"
                                >
                                    <Heart
                                        className={`w-5 h-5 ${isWishlisted ? "fill-[#fc2779] text-[#fc2779]" : "text-gray-600"}`}
                                    />
                                </button>
                                {showOOSButton ? (
                                    <button onClick={() => setNotifyModalVisible(true)} className="flex-1 h-12 rounded-full bg-[#fc2779] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#e0226b] transition-colors">
                                        <Bell className="w-4 h-4" />
                                        Notify Me
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleAddToBag}
                                        className="flex-1 h-12 rounded-full bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                                    >
                                        <ShoppingBag className="w-4 h-4" />
                                        Add to Bag
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Reviews */}
                {product?.product_reviews && (
                    <div className="max-w-7xl mx-auto px-8 py-10 border-t border-gray-100 mt-10">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Reviews</h3>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="text-center">
                                <span className="text-3xl font-black text-gray-900">{averageRating > 0 ? averageRating.toFixed(1) : "-"}</span>
                                <p className="text-sm text-gray-400">{totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        className={`w-5 h-5 ${s <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => setReviewsModalVisible(true)}
                                className="ml-auto border border-[#fc2779] rounded-lg px-4 py-2 flex items-center gap-1.5 hover:bg-[#fc2779]/5 transition-colors"
                            >
                                <Star className="w-4 h-4 text-[#fc2779]" />
                                <span className="text-sm font-bold text-[#fc2779]">Write a Review</span>
                            </button>
                        </div>
                        {product.product_reviews.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {product.product_reviews.slice(0, 4).map((r: any) => (
                                    <ReviewCard key={r.id} review={r} />
                                ))}
                            </div>
                        ) : (
                            <button onClick={() => setReviewsModalVisible(true)} className="text-sm text-gray-400 hover:text-gray-600">
                                Be the first to review this product
                            </button>
                        )}
                        {product.product_reviews.length > 4 && (
                            <button
                                onClick={() => setReviewsModalVisible(true)}
                                className="text-[#fc2779] text-sm font-semibold mt-4 hover:underline flex items-center gap-1"
                            >
                                View All {totalReviews} Reviews
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Desktop Similar Products */}
                {similarProducts.length > 0 && (
                    <div className="max-w-7xl mx-auto px-8 py-8 border-t border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Similar Products</h3>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {similarProducts.map((item: any) => (
                                <div key={item.id} className="w-48 shrink-0">
                                    <ProductCard product={item} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Desktop More from this brand */}
                {brandProducts.length > 0 && product?.brand && (
                    <div className="max-w-7xl mx-auto px-8 py-8 border-t border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            More from <span className="text-[#fc2779]">{product.brand}</span>
                        </h3>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {brandProducts.map((item: any) => (
                                <div key={item.id} className="w-48 shrink-0">
                                    <ProductCard product={item} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Variant Modal */}
            {variantModalVisible && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setVariantModalVisible(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto pb-8">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="text-base font-bold text-gray-900">Select Shade</h3>
                            <button onClick={() => setVariantModalVisible(false)}>
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-4 p-5">
                            {product.product_variants.map((v: any) => {
                                const isSelected = selectedVariant === v.id
                                const isOOS = v.stock != null && Number(v.stock) <= 0
                                const vp = getVariantPrice(v, discountType, discountValue)
                                return (
                                    <button
                                        key={v.id}
                                        onClick={() => {
                                            const variantImages = (v.variant_images || [])
                                                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                                                .map((vi: any) => vi.url)
                                                .filter(Boolean)
                                            setSelectedVariant(v.id)
                                            setSelectedVariantData({
                                                id: v.id, title: v.title, price: v.price,
                                                calculated_price: vp.salePrice, image_url: v.image_url || null,
                                                stock: v.stock, hex_code: v.hex_code,
                                                images: variantImages.length > 0 ? variantImages : (v.image_url ? [v.image_url] : []),
                                            })
                                            setVariantModalVisible(false)
                                        }}
                                        disabled={isOOS}
                                        className="flex flex-col items-center gap-1.5"
                                    >
                                        <div className="relative">
                                            <div
                                                className={`w-14 h-14 rounded-lg border-2 overflow-hidden ${isSelected ? "border-[#fc2779]" : "border-gray-200"} ${isOOS ? "opacity-30" : ""}`}
                                            >
                                                <div
                                                    className="w-full h-full"
                                                    style={{ backgroundColor: v.hex_code || "#f1f1f1" }}
                                                />
                                            </div>
                                            {isOOS && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-[7px] font-black text-gray-400 uppercase">OOS</span>
                                                </div>
                                            )}
                                        </div>
                                        {v.title && (
                                            <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{v.title}</span>
                                        )}
                                        <span className="text-[10px] font-bold text-gray-900">₹{Math.round(vp.salePrice)}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
            {/* Virtual Try-On */}
            <VirtualTryOn
                open={tryOnOpen}
                onClose={() => setTryOnOpen(false)}
                variants={(product?.product_variants || []).filter((v: any) => v.hex_code && v.hex_code !== "#cbd5e1").map((v: any) => ({ id: v.id, title: v.title, hex_code: v.hex_code }))}
                initialHexCode={selectedVariantData?.hex_code || "#fc2779"}
            />

            {/* Foundation Shade Finder */}
            <FoundationShadeFinder
                open={shadeFinderOpen}
                onClose={() => setShadeFinderOpen(false)}
                variants={(product?.product_variants || []).filter((v: any) => v.hex_code && v.hex_code !== "#cbd5e1").map((v: any) => ({ id: v.id, title: v.title, hex_code: v.hex_code }))}
            />

            {/* Review Modal */}
            <ReviewModal
                visible={reviewsModalVisible}
                productId={product.id}
                onClose={() => setReviewsModalVisible(false)}
            />

            {/* Notify Me Modal */}
            {notifyModalVisible && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setNotifyModalVisible(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl pb-8">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="text-base font-bold text-gray-900">Notify Me</h3>
                            <button onClick={() => setNotifyModalVisible(false)}>
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleNotifyMe} className="px-5 pt-5 space-y-4">
                            <p className="text-xs text-gray-500 leading-relaxed">
                                This item is currently out of stock. Leave your details and we'll notify you when it's back.
                            </p>
                            <input required name="name" type="text" placeholder="Full Name" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#fc2779]" />
                            <input required name="email" type="email" placeholder="Email Address" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#fc2779]" />
                            <input required name="phone" type="tel" placeholder="Phone Number" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#fc2779]" />
                            <button type="submit" className="w-full py-3 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors">
                                Notify Me
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
