"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createGiftProduct, updateGiftProduct } from "@/app/actions/gift-products"
import { toast } from "sonner"
import { Loader2, Upload, X } from "lucide-react"

interface GiftProductFormProps {
  initialData?: any
  isEdit?: boolean
}

export function GiftProductForm({ initialData, isEdit = false }: GiftProductFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialData?.name || "")
  const [brandName, setBrandName] = useState(initialData?.brand_name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [price, setPrice] = useState(initialData?.price || "")
  const [stock, setStock] = useState(initialData?.stock ?? "")
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || [])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isPending, setIsPending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files])
      const newPreviews = files.map(f => URL.createObjectURL(f))
      setImagePreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error("Name is required"); return }
    setIsPending(true)

    const formData = new FormData()
    const payload = JSON.stringify({
      name: name.trim(),
      brand_name: brandName.trim() || null,
      description: description.trim() || null,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      existing_images: existingImages,
      ...(isEdit ? { is_active: isActive } : {}),
    })
    formData.append("payload", payload)
    imageFiles.forEach(file => formData.append("files", file))

    const res = isEdit
      ? await updateGiftProduct(initialData.id, formData)
      : await createGiftProduct(formData)

    if (res.success) {
      toast.success(isEdit ? "Gift product updated" : "Gift product created")
      router.push("/admin/gift-products")
      router.refresh()
    } else {
      toast.error(res.error || "Something went wrong")
    }
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Free Lipstick" className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20" required />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Brand Name</label>
          <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. FOREVER52" className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20" />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={3} className="w-full px-4 py-3 mt-2 rounded-xl bg-slate-50 border-none font-medium text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
        </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Price <span className="text-slate-300 font-normal normal-case tracking-normal">(display/insurance value)</span></label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-3 text-slate-400 font-bold text-sm">₹</span>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" className="w-full h-11 pl-8 pr-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Stock</label>
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} min="0" className="w-full h-11 px-4 mt-2 rounded-xl bg-slate-50 border-none font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-500/20" placeholder="0" />
          </div>
          {isEdit && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Status</label>
              <div className="flex gap-3 mt-2">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" onClick={() => setIsActive(v)}
                    className={`flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${isActive === v ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {v ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Multiple Images Upload */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Images</label>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          
          <div className="mt-2 flex flex-wrap gap-4">
            {/* Existing images from database */}
            {existingImages.map((url, idx) => (
              <div key={`existing-${idx}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                <img src={url} className="w-full h-full object-cover" alt={`Existing ${idx + 1}`} />
                <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center hover:bg-red-500 transition-colors">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            
            {/* New image previews */}
            {imagePreviews.map((preview, idx) => (
              <div key={`preview-${idx}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-rose-200">
                <img src={preview} className="w-full h-full object-cover" alt={`New ${idx + 1}`} />
                <button type="button" onClick={() => removeNewImage(idx)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center hover:bg-red-500 transition-colors">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            
            {/* Upload button */}
            <button type="button" onClick={() => fileRef.current?.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-colors">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-[8px] font-bold text-slate-400 uppercase">Add Image</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-xl h-11 px-6 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
        <button type="submit" disabled={isPending} className="rounded-xl h-11 px-8 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 disabled:opacity-50">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}
