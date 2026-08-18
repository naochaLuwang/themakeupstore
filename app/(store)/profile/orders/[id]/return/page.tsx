"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { ArrowLeft, Package, Upload, X, Loader2, CheckCircle2 } from "lucide-react"
import { submitReturnRequest } from "@/app/actions/customer-return"
import { toast } from "sonner"

export default function ReturnRequestPage() {
    const { id: orderId } = useParams<{ id: string }>()
    const searchParams = useSearchParams()
    const preselectedItem = searchParams.get("item")
    const router = useRouter()
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [orderItems, setOrderItems] = useState<any[]>([])
    const [existingReturns, setExistingReturns] = useState<string[]>([])
    const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItem || "")
    const [reason, setReason] = useState("")
    const [imageFiles, setImageFiles] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (orderId) fetchData()
    }, [orderId])

    const fetchData = async () => {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) {
            router.push("/login")
            return
        }

        const { data: order } = await supabase
            .from("orders")
            .select(`
                id, status,
                order_items (
                    id, product_id, product_variant_id, product_name, variant_title,
                    sku, quantity, unit_price, mrp,
                    products:product_id (thumbnail_url)
                )
            `)
            .eq("id", orderId)
            .eq("user_id", user.user.id)
            .single()

        if (!order || !["delivered", "picked_up"].includes(order.status)) {
            router.push(`/profile/orders/${orderId}`)
            return
        }

        setOrderItems(order.order_items || [])

        const { data: returns } = await supabase
            .from("return_requests")
            .select("product_id, product_variant_id")
            .eq("order_id", orderId)

        if (returns) {
            setExistingReturns(returns.map((r: any) => r.product_variant_id).filter(Boolean))
            const returnedIds = returns.map((r: any) => r.product_id)
            const stillAvailable = (order.order_items || []).filter(
                (item: any) => !returnedIds.includes(item.product_id)
            )
            if (stillAvailable.length > 0 && !preselectedItem) {
                setSelectedItemId(stillAvailable[0].id)
            }
        }

        setLoading(false)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const newFiles = [...imageFiles, ...files].slice(0, 5)
        setImageFiles(newFiles)

        const newPreviews = newFiles.map(f => URL.createObjectURL(f))
        imagePreviews.forEach(url => { if (url.startsWith("blob:")) URL.revokeObjectURL(url) })
        setImagePreviews(newPreviews)

        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const removeImage = (idx: number) => {
        URL.revokeObjectURL(imagePreviews[idx])
        setImageFiles(prev => prev.filter((_, i) => i !== idx))
        setImagePreviews(prev => prev.filter((_, i) => i !== idx))
    }

    const handleSubmit = async () => {
        if (!selectedItemId) { toast.error("Select an item to return"); return }
        if (!reason.trim()) { toast.error("Tell us why you're returning"); return }
        if (imageFiles.length === 0) { toast.error("Upload at least one proof image"); return }

        setSubmitting(true)
        try {
            const formData = new FormData()
            formData.append("order_id", orderId)
            formData.append("order_item_id", selectedItemId)
            formData.append("reason", reason.trim())
            imageFiles.forEach(f => formData.append("images", f))

            await submitReturnRequest(formData)
            setSuccess(true)
        } catch (err: any) {
            toast.error(err.message || "Something went wrong")
        } finally {
            setSubmitting(false)
        }
    }

    const selectedItem = orderItems.find(i => i.id === selectedItemId)
    const isAlreadyReturned = (item: any) =>
        existingReturns.includes(item.product_variant_id)

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Return Requested</h2>
                <p className="text-sm text-gray-500 text-center mb-8">
                    We'll review your request and get back to you within 2-3 business days.
                </p>
                <button
                    onClick={() => window.location.href = `/profile/orders`}
                    className="px-6 py-3 rounded-xl bg-[#FC2779] text-white font-bold text-sm"
                >
                    Back to Orders
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="flex items-center px-5 pt-3 pb-3">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
                    <ArrowLeft className="w-5 h-5 text-gray-800" />
                </button>
                <h1 className="text-lg font-bold text-gray-900 ml-2">Request Return</h1>
            </div>

            <div className="px-5 pb-24 space-y-6">
                {/* Item Selection */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Select Item
                    </label>
                    <div className="mt-2 space-y-2">
                        {orderItems.map(item => {
                            const returned = isAlreadyReturned(item)
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    disabled={returned}
                                    onClick={() => setSelectedItemId(item.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                        selectedItemId === item.id
                                            ? "border-[#FC2779] bg-pink-50"
                                            : returned
                                            ? "border-gray-100 bg-gray-50 opacity-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    {item.products?.thumbnail_url ? (
                                        <img src={item.products.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-50" loading="lazy" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                                            <Package className="w-5 h-5 text-gray-300" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                                        {item.variant_title && (
                                            <p className="text-xs text-gray-400">{item.variant_title}</p>
                                        )}
                                        <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                                    </div>
                                    {returned && (
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Returned</span>
                                    )}
                                    {selectedItemId === item.id && (
                                        <div className="w-5 h-5 rounded-full bg-[#FC2779] flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Reason */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Reason for Return
                    </label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Tell us why you'd like to return this item..."
                        rows={4}
                        maxLength={500}
                        className="w-full mt-2 p-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FC2779]/20 focus:border-[#FC2779] resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
                </div>

                {/* Images */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Proof Images <span className="text-[#FC2779] normal-case">(required, up to 5)</span>
                    </label>
                    <div className="mt-2 flex gap-3 flex-wrap">
                        {imagePreviews.map((url, i) => (
                            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                <img src={url} alt="Return item photo" className="w-full h-full object-cover" loading="lazy" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(i)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        ))}
                        {imagePreviews.length < 5 && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-gray-300 transition-colors"
                            >
                                <Upload className="w-5 h-5 text-gray-300" />
                                <span className="text-[9px] text-gray-300 font-medium">Upload</span>
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-4 rounded-xl bg-[#FC2779] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        "Submit Return Request"
                    )}
                </button>
            </div>
        </div>
    )
}
