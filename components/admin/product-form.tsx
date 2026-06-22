
"use client"

import * as React from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, type ProductFormValues } from "@/lib/validations/product"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
    Trash2, Plus, Upload, Info, Pipette, Loader2,
    IndianRupee, CheckCircle2, Tag, GripVertical,
    ChevronRight, X, PlusCircle, Image as ImageIcon, AlertTriangle
} from "lucide-react"
import { createProduct, updateProduct } from "@/app/actions/products"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Rich Text Editor Component
import { RichTextEditor } from "@/components/ui/RichTextEditor"

// DND Kit Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AnimatePresence, motion } from "framer-motion"

const STOCK_THRESHOLD = 3;

// --- SORTABLE IMAGE ITEM ---
function SortableImage({ url, index, onRemove }: { url: string; index: number; onRemove: (i: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.3 : 1 }

    return (
        <div ref={setNodeRef} style={style} className="relative aspect-square rounded-[1.25rem] border border-slate-100 group overflow-hidden bg-slate-50 shadow-inner">
            <img src={url} className="object-cover w-full h-full pointer-events-none" alt="gallery" />
            <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                <GripVertical className="text-white w-6 h-6" />
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(index); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors z-20">
                <Trash2 className="w-4 h-4" />
            </button>
            {index === 0 && <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-md text-[8px] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-xl">Cover</div>}
            <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-[8px] text-slate-500 px-2 py-0.5 rounded-md font-bold">{index + 1}</div>
        </div>
    )
}

interface ProductFormProps {
    categories: { id: string; name: string }[]
    concerns?: { id: string; name: string }[]
    initialData?: any
    isEdit?: boolean
}

export default function ProductForm({ categories = [], concerns = [], initialData, isEdit = false }: ProductFormProps) {
    const [mounted, setMounted] = React.useState(false)
    const [previews, setPreviews] = React.useState<string[]>([])
    const [isPending, setIsPending] = React.useState(false)
    const [isSuccess, setIsSuccess] = React.useState(false)
    const router = useRouter()
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            name: "", slug: "", description: "", brand: "",
            has_variants: false, category_ids: [], concern_ids: [], base_price: 0, stock: 0,
            discount_type: "none", discount_value: 0, image_files: [], existing_images: [], variants: []
        }
    })

    const { fields: vFields, append: addV, remove: remV } = useFieldArray({ control: form.control, name: "variants" })
    const hasVariants = form.watch("has_variants")

    React.useEffect(() => {
        setMounted(true)
        if (initialData) {
            const normalizedData = {
                ...initialData,
                base_price: Number(initialData.base_price) || 0,
                stock: !initialData.has_variants ? (initialData.variants?.find((v: any) => v.is_default)?.stock || 0) : 0,
                discount_value: Number(initialData.discount_value) || 0,
                variants: initialData.variants?.filter((v: any) => !v.is_default).map((v: any) => ({
                    ...v,
                    price: Number(v.price) || 0,
                    stock: Number(v.stock) || 0,
                    discount_value: Number(v.discount_value) || 0,
                    variant_image_urls: v.variant_images?.map((img: any) => img.url) || []
                })) || []
            }
            form.reset(normalizedData)
            if (initialData.product_images) setPreviews(initialData.product_images.map((img: any) => img.url))
        }
    }, [initialData, form])

    const nameWatch = form.watch("name")
    React.useEffect(() => {
        if (nameWatch && !isEdit) {
            const generatedSlug = nameWatch.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
            form.setValue("slug", generatedSlug, { shouldValidate: true });
        }
    }, [nameWatch, form, isEdit]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return
        const fileArray = Array.from(files)
        const currentFiles = form.getValues("image_files") || []
        form.setValue("image_files", [...currentFiles, ...fileArray])
        const newPreviews = fileArray.map(file => URL.createObjectURL(file))
        setPreviews(prev => [...prev, ...newPreviews])
    }

    const removeImage = (index: number) => {
        const urlToRemove = previews[index]
        setPreviews(prev => prev.filter((_, i) => i !== index))
        const currentFiles = form.getValues("image_files") || []
        const existingCount = initialData?.product_images?.length || 0
        const fileIndex = index - existingCount
        if (fileIndex >= 0) form.setValue("image_files", currentFiles.filter((_, i) => i !== fileIndex))

        const variants = form.getValues("variants")
        variants.forEach((v, vIdx) => {
            if (v.variant_image_urls?.includes(urlToRemove)) {
                form.setValue(`variants.${vIdx}.variant_image_urls`, v.variant_image_urls.filter(u => u !== urlToRemove))
            }
        })
    }

    const toggleVariantImage = (vIdx: number, url: string) => {
        const current = form.getValues(`variants.${vIdx}.variant_image_urls`) || []
        const next = current.includes(url) ? current.filter(u => u !== url) : [...current, url]
        form.setValue(`variants.${vIdx}.variant_image_urls`, next, { shouldDirty: true })
    }

    const handleNumberChange = (val: string, onChange: (v: number) => void) => {
        const clean = val.replace(/[^0-9.]/g, "")
        onChange(clean === "" ? 0 : parseFloat(clean))
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setPreviews((items) => {
                const oldIndex = items.indexOf(active.id as string)
                const newIndex = items.indexOf(over.id as string)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    async function onSubmit(values: ProductFormValues) {
        setIsPending(true)
        try {
            const formData = new FormData()
            const actualVariants = values.has_variants ? values.variants.map((v) => ({
                ...v,
                image_indices: (v.variant_image_urls || []).map(url => previews.indexOf(url)).filter(idx => idx !== -1)
            })) : [];

            const payload = { ...values, variants: actualVariants, existing_images: previews.filter(p => !p.startsWith('blob:')) }
            formData.append("payload", JSON.stringify(payload))
            values.image_files?.forEach((file: File) => formData.append("files", file))

            const res = isEdit ? await updateProduct(initialData.id, formData) : await createProduct(formData)
            if (res.success) {
                setIsSuccess(true)
                toast.success("Deployment Successful")
                setTimeout(() => { router.push("/admin/products"); router.refresh() }, 1000)
            } else toast.error(res.error)
        } catch (e) { toast.error("Transmission Error") } finally { setIsPending(false) }
    }

    if (!mounted) return null

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-1">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic">{isEdit ? "Refine Item" : "New Entry"}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-slate-400">Inventory Control Protocol</p>
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" onClick={() => router.back()} className="rounded-xl font-bold uppercase text-[10px]">Discard</Button>
                        <Button
                            type="submit"
                            disabled={isPending || isSuccess}
                            className={`min-w-[180px] h-12 rounded-xl text-[11px] font-black uppercase transition-all duration-300 ${isSuccess ? "bg-emerald-500 text-white shadow-emerald-100" : "bg-slate-900 text-white shadow-xl shadow-slate-200"}`}
                        >
                            {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : isSuccess ? <CheckCircle2 className="w-4 h-4" /> : "Deploy System"}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* CORE ATTRIBUTES */}
                        <Card className="rounded-[2.5rem] border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b p-6">
                                <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Info className="w-4 h-4" /> Identification</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel className="text-[10px] font-black uppercase">Title</FormLabel><FormControl><Input className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" {...field} /></FormControl></FormItem>} />
                                    <FormField control={form.control} name="brand" render={({ field }) => <FormItem><FormLabel className="text-[10px] font-black uppercase">Brand Authority</FormLabel><FormControl><Input className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" {...field} /></FormControl></FormItem>} />
                                </div>
                                <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel className="text-[10px] font-black uppercase">Narration</FormLabel><RichTextEditor value={field.value} onChange={field.onChange} /></FormItem>} />
                                <FormField control={form.control} name="category_ids" render={({ field }) => <FormItem><FormLabel className="text-[10px] font-black uppercase">Collections</FormLabel><MultiSelect options={categories.map(c => ({ label: c.name, value: c.id }))} selected={field.value || []} onChange={field.onChange} /></FormItem>} />
                            </CardContent>
                        </Card>

                        {/* SHADE PALETTE */}
                        <Card className={`rounded-[2.5rem] transition-all duration-300 ${hasVariants ? "border-indigo-100 bg-indigo-50/10 shadow-sm" : "border-slate-200"}`}>
                            <CardHeader className="flex flex-row items-center justify-between border-b p-6 bg-slate-50/50">
                                <CardTitle className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2"><Pipette className="w-4 h-4" /> Shade Palette</CardTitle>
                                <FormField control={form.control} name="has_variants" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                            </CardHeader>
                            <CardContent className="pt-6">
                                {hasVariants ? (
                                    <div className="space-y-6">
                                        {vFields.map((field, index) => {
                                            const selectedImages = form.watch(`variants.${index}.variant_image_urls`) || [];
                                            const hexCode = form.watch(`variants.${index}.hex_code`) || "#cbd5e1";
                                            const stockCount = form.watch(`variants.${index}.stock`) || 0;
                                            const isLowStock = stockCount <= STOCK_THRESHOLD;

                                            return (
                                                <div key={field.id} className="group relative p-8 border border-slate-100 rounded-[2.5rem] bg-white space-y-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">

                                                    <div className="flex flex-col lg:flex-row gap-10">
                                                        <div className="flex-1 space-y-5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-4 w-1 bg-indigo-500 rounded-full" />
                                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Visual Identity</h4>
                                                            </div>
                                                            <div className="flex items-start gap-6">
                                                                <div className="flex flex-col items-center gap-3 shrink-0">
                                                                    <div className="w-14 h-14 rounded-2xl border-4 border-white shadow-xl transition-transform duration-500 group-hover:scale-110" style={{ backgroundColor: hexCode.startsWith('#') ? hexCode : `#${hexCode}` }} />
                                                                    <Input className="w-24 h-10 rounded-xl text-[10px] font-mono uppercase bg-slate-50 border-none text-center focus:bg-white transition-all shadow-inner" placeholder="#HEXCODE" {...form.register(`variants.${index}.hex_code`)} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Shade Designation</FormLabel>
                                                                    <Input className="rounded-2xl h-14 bg-slate-50 border-none font-bold text-slate-900 text-base focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="e.g. Midnight Velvet" {...form.register(`variants.${index}.title`)} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* --- FIXED DIALOG MAPPING --- */}
                                                        <div className="lg:w-48 space-y-5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-4 w-1 bg-slate-200 rounded-full" />
                                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Media</h4>
                                                            </div>
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <button type="button" className={`group relative w-full h-24 rounded-[2rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-2 ${selectedImages.length > 0 ? 'border-indigo-600 bg-indigo-50/40 text-indigo-600 shadow-inner' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-400 hover:bg-white'}`}>
                                                                        {selectedImages.length > 0 ? (
                                                                            <><span className="text-2xl font-black italic tracking-tighter leading-none">{selectedImages.length}</span><span className="text-[8px] font-black uppercase tracking-widest opacity-70">Assets Linked</span></>
                                                                        ) : (
                                                                            <><PlusCircle className="w-6 h-6 opacity-30 group-hover:scale-110 group-hover:opacity-100 transition-all" /><span className="text-[8px] font-black uppercase tracking-widest">Assign Gallery</span></>
                                                                        )}
                                                                    </button>
                                                                </DialogTrigger>
                                                                <DialogContent className="!fixed !inset-0 !m-0 !p-0 !max-w-none !w-screen !h-screen !translate-x-0 !translate-y-0 border-none rounded-none flex flex-col bg-white z-[9999] outline-none overflow-hidden">
                                                                    <div className="h-28 px-10 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
                                                                        <div className="space-y-1">
                                                                            <DialogTitle className="text-4xl font-black uppercase tracking-tighter italic text-slate-900 leading-none">Media Library</DialogTitle>
                                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">{selectedImages.length} Assets Linked</span>
                                                                        </div>
                                                                        <DialogClose asChild><Button variant="ghost" className="w-14 h-14 rounded-2xl bg-slate-50 hover:bg-slate-900 hover:text-white transition-all duration-300"><X className="w-6 h-6" /></Button></DialogClose>
                                                                    </div>
                                                                    <div className="flex-1 overflow-y-auto p-10 bg-[#fafafa] custom-scrollbar">
                                                                        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-8 w-full pb-32">
                                                                            {previews.map((url, imgIndex) => {
                                                                                const selectedIdx = selectedImages.indexOf(url);
                                                                                const isSelected = selectedIdx !== -1;
                                                                                return (
                                                                                    <button key={url} type="button" onClick={() => toggleVariantImage(index, url)} className="group relative w-full text-left">
                                                                                        <div className={`relative aspect-square rounded-[2.5rem] overflow-hidden transition-all duration-500 ${isSelected ? 'ring-[10px] ring-indigo-600 ring-offset-4 scale-[0.95] shadow-xl shadow-indigo-100' : 'hover:-translate-y-2 hover:shadow-xl shadow-sm border border-slate-100 bg-white'}`}>
                                                                                            <img src={url} className={`w-full h-full object-cover transition-all duration-700 ${isSelected ? 'brightness-[0.3]' : 'group-hover:scale-105'}`} alt="preview" />
                                                                                            <AnimatePresence>
                                                                                                {isSelected && (
                                                                                                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute inset-0 flex items-center justify-center">
                                                                                                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-[4px] border-indigo-600 shadow-xl">
                                                                                                            <span className="text-2xl font-black text-indigo-600 italic">{selectedIdx + 1}</span>
                                                                                                        </div>
                                                                                                    </motion.div>
                                                                                                )}
                                                                                            </AnimatePresence>
                                                                                        </div>
                                                                                    </button>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-28 px-10 border-t border-slate-100 bg-white flex items-center justify-end shrink-0">
                                                                        <DialogClose asChild><Button className="px-16 h-14 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.5em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95">Update Workspace</Button></DialogClose>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>

                                                        <div className="absolute top-8 right-8">
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => remV(index)} className="text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl h-12 w-12 transition-all"><Trash2 className="w-5 h-5" /></Button>
                                                        </div>
                                                    </div>

                                                    <div className="pt-8 border-t border-slate-50">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                            <div className="space-y-2"><FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Retail Price</FormLabel><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">₹</span><Input className="rounded-xl h-12 font-bold text-slate-900 bg-slate-50/50 border-none pl-8 focus:bg-white" value={form.watch(`variants.${index}.price`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.price`, v))} /></div></div>
                                                            <div className="space-y-2"><div className="flex justify-between px-1"><FormLabel className={`text-[9px] font-black uppercase tracking-widest ${isLowStock ? 'text-rose-500' : ''}`}>Stock Level</FormLabel>{isLowStock && <AlertTriangle className="w-3 h-3 text-rose-500 animate-pulse" />}</div><Input className={`rounded-xl h-12 font-black border-none px-4 transition-colors ${isLowStock ? 'bg-rose-50 text-rose-600' : 'bg-slate-50/50 text-slate-900 focus:bg-white'}`} value={form.watch(`variants.${index}.stock`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.stock`, v))} /></div>
                                                            <div className="space-y-2"><FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Discount Mode</FormLabel><Select onValueChange={(v) => form.setValue(`variants.${index}.discount_type`, v as any)} value={form.watch(`variants.${index}.discount_type`)}><SelectTrigger className="h-12 rounded-xl text-slate-900 bg-slate-50/50 border-none font-black uppercase text-[10px] tracking-widest focus:bg-white shadow-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Standard</SelectItem><SelectItem value="percentage">Percentage %</SelectItem><SelectItem value="amount">Fixed Amount</SelectItem></SelectContent></Select></div>
                                                            <div className="space-y-2"><FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Reduction Value</FormLabel><Input className="rounded-xl h-12 text-slate-900 bg-slate-50/50 border-none px-4 font-bold focus:bg-white" value={form.watch(`variants.${index}.discount_value`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.discount_value`, v))} /></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <Button type="button" variant="outline" className="w-full border-2 border-dashed border-slate-100 h-20 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] text-slate-300 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all duration-500" onClick={() => addV({ title: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#cbd5e1", variant_image_urls: [] })}><Plus className="w-5 h-5 mr-3" /> Append New Shade Entry</Button>
                                    </div>
                                ) : (
                                    <div className="py-24 text-center border-2 border-dashed border-slate-50 rounded-[3rem] bg-slate-50/20"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Default Inventory Management Protocol</p></div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* MASTER INVENTORY */}
                        {!hasVariants && (
                            <Card className="rounded-[2rem] border-blue-100 bg-blue-50/20 shadow-sm">
                                <CardHeader className="bg-blue-50/50 border-b border-blue-100"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-900 flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Global Pricing</CardTitle></CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <FormField control={form.control} name="base_price" render={({ field }) => <FormItem><FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-900">Retail Price</FormLabel><FormControl><Input className="h-12 rounded-xl bg-white border-blue-100 font-bold text-slate-900" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormControl></FormItem>} />
                                    <FormField control={form.control} name="stock" render={({ field }) => <FormItem><FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-900">Total Units</FormLabel><FormControl><Input className="h-12 rounded-xl bg-white border-blue-100 font-black text-slate-900" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormControl></FormItem>} />
                                </CardContent>
                            </Card>
                        )}

                        {/* MASTER GALLERY */}
                        <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b p-6"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Global Media Assets</CardTitle></CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <input type="file" ref={fileInputRef} multiple className="hidden" accept="image/*" onChange={handleImageChange} />
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-[1.5rem] border-slate-200 p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all group">
                                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    <p className="text-[10px] font-black uppercase mt-3 text-slate-400">Import Media</p>
                                </div>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={previews} strategy={rectSortingStrategy}>
                                        <div className="grid grid-cols-2 gap-3">
                                            {previews.map((src, i) => <SortableImage key={src} url={src} index={i} onRemove={removeImage} />)}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </CardContent>
                        </Card>

                        {/* CONCERNS */}
                        <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b p-6">
                                <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                    Concerns
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-1 max-h-[300px] overflow-y-auto">
                                {concerns.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 text-center py-4 font-medium">No concerns available</p>
                                ) : (
                                    concerns.map((c) => {
                                        const checked = (form.watch("concern_ids") || []).includes(c.id)
                                        return (
                                            <label
                                                key={c.id}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${checked ? "bg-rose-50/40" : "hover:bg-slate-50"}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {
                                                        const current = form.getValues("concern_ids") || []
                                                        if (current.includes(c.id)) {
                                                            form.setValue("concern_ids", current.filter(id => id !== c.id), { shouldDirty: true })
                                                        } else {
                                                            form.setValue("concern_ids", [...current, c.id], { shouldDirty: true })
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500/20"
                                                />
                                                <span className="text-xs font-semibold text-slate-700">{c.name}</span>
                                            </label>
                                        )
                                    })
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    )
}


// "use client"

// import * as React from "react"
// import { useForm, useFieldArray } from "react-hook-form"
// import { zodResolver } from "@hookform/resolvers/zod"
// import { productSchema, type ProductFormValues } from "@/lib/validations/product"
// import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { Switch } from "@/components/ui/switch"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { MultiSelect } from "@/components/ui/multi-select"
// import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import {
//     Trash2, Plus, Upload, Info, Pipette, Loader2,
//     IndianRupee, CheckCircle2, GripVertical,
//     X, PlusCircle, Image as ImageIcon, AlertTriangle
// } from "lucide-react"
// import { createProduct, updateProduct } from "@/app/actions/products"
// import { toast } from "sonner"
// import { useRouter } from "next/navigation"

// // Rich Text Editor Component
// import { RichTextEditor } from "@/components/ui/RichTextEditor"

// // DND Kit Imports
// import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
// import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
// import { CSS } from "@dnd-kit/utilities"
// import { AnimatePresence, motion } from "framer-motion"

// const STOCK_THRESHOLD = 3;

// // --- SORTABLE IMAGE ITEM ---
// function SortableImage({ url, index, onRemove }: { url: string; index: number; onRemove: (i: number) => void }) {
//     const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
//     const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.3 : 1 }

//     return (
//         <div ref={setNodeRef} style={style} className="relative aspect-square rounded-[1rem] border border-slate-100 group overflow-hidden bg-slate-50 shadow-inner">
//             <img src={url} className="object-cover w-full h-full pointer-events-none" alt="gallery" />
//             <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
//                 <GripVertical className="text-white w-5 h-5" />
//             </div>
//             <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(index); }} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors z-20">
//                 <Trash2 className="w-3.5 h-3.5" />
//             </button>
//             {index === 0 && <div className="absolute top-1.5 left-1.5 bg-slate-900/90 backdrop-blur-md text-[7px] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-xl">Cover</div>}
//             <div className="absolute bottom-1.5 right-1.5 bg-white/80 backdrop-blur-sm text-[7px] text-slate-500 px-1.5 py-0.5 rounded-md font-bold">{index + 1}</div>
//         </div>
//     )
// }

// interface ProductFormProps {
//     categories: { id: string; name: string }[]
//     initialData?: any
//     isEdit?: boolean
// }

// export default function ProductForm({ categories = [], initialData, isEdit = false }: ProductFormProps) {
//     const [mounted, setMounted] = React.useState(false)
//     const [previews, setPreviews] = React.useState<string[]>([])
//     const [isPending, setIsPending] = React.useState(false)
//     const [isSuccess, setIsSuccess] = React.useState(false)
//     const router = useRouter()
//     const fileInputRef = React.useRef<HTMLInputElement>(null)

//     const sensors = useSensors(
//         useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
//         useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
//     )

//     const form = useForm<ProductFormValues>({
//         resolver: zodResolver(productSchema) as any,
//         defaultValues: {
//             name: "", slug: "", description: "", brand: "",
//             has_variants: false, category_ids: [], base_price: 0, stock: 0,
//             discount_type: "none", discount_value: 0, image_files: [], existing_images: [], variants: []
//         }
//     })

//     const { fields: vFields, append: addV, remove: remV } = useFieldArray({ control: form.control, name: "variants" })
//     const hasVariants = form.watch("has_variants")

//     React.useEffect(() => {
//         setMounted(true)
//         if (initialData) {
//             const normalizedData = {
//                 ...initialData,
//                 base_price: Number(initialData.base_price) || 0,
//                 stock: !initialData.has_variants ? (initialData.variants?.find((v: any) => v.is_default)?.stock || 0) : 0,
//                 discount_value: Number(initialData.discount_value) || 0,
//                 variants: initialData.variants?.filter((v: any) => !v.is_default).map((v: any) => ({
//                     ...v,
//                     price: Number(v.price) || 0,
//                     stock: Number(v.stock) || 0,
//                     discount_value: Number(v.discount_value) || 0,
//                     variant_image_urls: v.variant_images?.map((img: any) => img.url) || []
//                 })) || []
//             }
//             form.reset(normalizedData)
//             if (initialData.product_images) setPreviews(initialData.product_images.map((img: any) => img.url))
//         }
//     }, [initialData, form])

//     const nameWatch = form.watch("name")
//     React.useEffect(() => {
//         if (nameWatch && !isEdit) {
//             const generatedSlug = nameWatch.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
//             form.setValue("slug", generatedSlug, { shouldValidate: true });
//         }
//     }, [nameWatch, form, isEdit]);

//     const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const files = e.target.files
//         if (!files) return
//         const fileArray = Array.from(files)
//         const currentFiles = form.getValues("image_files") || []
//         form.setValue("image_files", [...currentFiles, ...fileArray])
//         const newPreviews = fileArray.map(file => URL.createObjectURL(file))
//         setPreviews(prev => [...prev, ...newPreviews])
//     }

//     const removeImage = (index: number) => {
//         const urlToRemove = previews[index]
//         setPreviews(prev => prev.filter((_, i) => i !== index))
//         const currentFiles = form.getValues("image_files") || []
//         const existingCount = initialData?.product_images?.length || 0
//         const fileIndex = index - existingCount
//         if (fileIndex >= 0) form.setValue("image_files", currentFiles.filter((_, i) => i !== fileIndex))

//         const variants = form.getValues("variants")
//         variants.forEach((v, vIdx) => {
//             if (v.variant_image_urls?.includes(urlToRemove)) {
//                 form.setValue(`variants.${vIdx}.variant_image_urls`, v.variant_image_urls.filter(u => u !== urlToRemove))
//             }
//         })
//     }

//     const toggleVariantImage = (vIdx: number, url: string) => {
//         const current = form.getValues(`variants.${vIdx}.variant_image_urls`) || []
//         const next = current.includes(url) ? current.filter(u => u !== url) : [...current, url]
//         form.setValue(`variants.${vIdx}.variant_image_urls`, next, { shouldDirty: true })
//     }

//     const handleNumberChange = (val: string, onChange: (v: number) => void) => {
//         const clean = val.replace(/[^0-9.]/g, "")
//         onChange(clean === "" ? 0 : parseFloat(clean))
//     }

//     const handleDragEnd = (event: DragEndEvent) => {
//         const { active, over } = event
//         if (over && active.id !== over.id) {
//             setPreviews((items) => {
//                 const oldIndex = items.indexOf(active.id as string)
//                 const newIndex = items.indexOf(over.id as string)
//                 return arrayMove(items, oldIndex, newIndex)
//             })
//         }
//     }

//     async function onSubmit(values: ProductFormValues) {
//         setIsPending(true)
//         try {
//             const formData = new FormData()
//             const actualVariants = values.has_variants ? values.variants.map((v) => ({
//                 ...v,
//                 image_indices: (v.variant_image_urls || []).map(url => previews.indexOf(url)).filter(idx => idx !== -1)
//             })) : [];

//             const payload = { ...values, variants: actualVariants, existing_images: previews.filter(p => !p.startsWith('blob:')) }
//             formData.append("payload", JSON.stringify(payload))
//             values.image_files?.forEach((file: File) => formData.append("files", file))

//             const res = isEdit ? await updateProduct(initialData.id, formData) : await createProduct(formData)
//             if (res.success) {
//                 setIsSuccess(true)
//                 toast.success("Deployment Successful")
//                 setTimeout(() => { router.push("/admin/products"); router.refresh() }, 1000)
//             } else toast.error(res.error)
//         } catch (e) { toast.error("Transmission Error") } finally { setIsPending(false) }
//     }

//     if (!mounted) return null

//     return (
//         <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 lg:space-y-8 pb-20">
//                 {/* RESPONSIVE STICKY HEADER FOR TWA */}
//                 <div className="sticky top-0 z-40 -mx-4 px-4 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between lg:relative lg:top-auto lg:mx-0 lg:px-0 lg:border-none lg:bg-transparent lg:pb-6">
//                     <div>
//                         <h1 className="text-xl lg:text-3xl font-black tracking-tighter uppercase italic text-slate-900">
//                             {isEdit ? "Refine" : "New Entry"}
//                         </h1>
//                         <p className="hidden sm:block text-[10px] font-bold uppercase tracking-widest mt-0.5 text-slate-400">Inventory Control Protocol</p>
//                     </div>
//                     <div className="flex gap-2 lg:gap-3">
//                         <Button type="button" variant="ghost" onClick={() => router.back()} className="h-10 rounded-xl font-bold uppercase text-[9px] lg:text-[10px] px-3">Discard</Button>
//                         <Button
//                             type="submit"
//                             disabled={isPending || isSuccess}
//                             className={`min-w-[120px] lg:min-w-[180px] h-10 lg:h-12 rounded-xl text-[10px] lg:text-[11px] font-black uppercase transition-all duration-300 shadow-lg ${isSuccess ? "bg-emerald-500 text-white shadow-emerald-100" : "bg-slate-900 text-white shadow-slate-200"}`}
//                         >
//                             {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : isSuccess ? <CheckCircle2 className="w-4 h-4" /> : "Deploy System"}
//                         </Button>
//                     </div>
//                 </div>

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
//                     <div className="lg:col-span-2 space-y-6 lg:space-y-8">
//                         {/* CORE ATTRIBUTES */}
//                         <Card className="rounded-[1.5rem] lg:rounded-[2.5rem] border-slate-200 shadow-sm overflow-hidden">
//                             <CardHeader className="bg-slate-50 border-b p-4 lg:p-6">
//                                 <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
//                                     <Info className="w-4 h-4" /> Identification
//                                 </CardTitle>
//                             </CardHeader>
//                             <CardContent className="space-y-5 lg:space-y-6 pt-4 lg:pt-6 px-4 lg:px-6">
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
//                                     <FormField control={form.control} name="name" render={({ field }) => (
//                                         <FormItem>
//                                             <FormLabel className="text-[9px] lg:text-[10px] font-black uppercase tracking-tight">Product Title</FormLabel>
//                                             <FormControl><Input className="h-11 lg:h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900 focus:bg-white" {...field} /></FormControl>
//                                         </FormItem>
//                                     )} />
//                                     <FormField control={form.control} name="brand" render={({ field }) => (
//                                         <FormItem>
//                                             <FormLabel className="text-[9px] lg:text-[10px] font-black uppercase tracking-tight">Brand Authority</FormLabel>
//                                             <FormControl><Input className="h-11 lg:h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900 focus:bg-white" {...field} /></FormControl>
//                                         </FormItem>
//                                     )} />
//                                 </div>
//                                 <FormField control={form.control} name="description" render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel className="text-[9px] lg:text-[10px] font-black uppercase tracking-tight">Narration</FormLabel>
//                                         <RichTextEditor value={field.value} onChange={field.onChange} />
//                                     </FormItem>
//                                 )} />
//                                 <FormField control={form.control} name="category_ids" render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel className="text-[9px] lg:text-[10px] font-black uppercase tracking-tight">Collections</FormLabel>
//                                         <MultiSelect options={categories.map(c => ({ label: c.name, value: c.id }))} selected={field.value || []} onChange={field.onChange} />
//                                     </FormItem>
//                                 )} />
//                             </CardContent>
//                         </Card>

//                         {/* SHADE PALETTE (VARIANTS) */}
//                         <Card className={`rounded-[1.5rem] lg:rounded-[2.5rem] transition-all duration-300 ${hasVariants ? "border-indigo-100 bg-indigo-50/10 shadow-sm" : "border-slate-200"}`}>
//                             <CardHeader className="flex flex-row items-center justify-between border-b p-4 lg:p-6 bg-slate-50/50">
//                                 <CardTitle className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2">
//                                     <Pipette className="w-4 h-4" /> Shade Palette
//                                 </CardTitle>
//                                 <FormField control={form.control} name="has_variants" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
//                             </CardHeader>
//                             <CardContent className="p-4 lg:p-6">
//                                 {hasVariants ? (
//                                     <div className="space-y-4 lg:space-y-6">
//                                         {vFields.map((field, index) => {
//                                             const selectedImages = form.watch(`variants.${index}.variant_image_urls`) || [];
//                                             const hexCode = form.watch(`variants.${index}.hex_code`) || "#cbd5e1";
//                                             const stockCount = form.watch(`variants.${index}.stock`) || 0;
//                                             const isLowStock = stockCount <= STOCK_THRESHOLD;

//                                             return (
//                                                 <div key={field.id} className="group relative p-5 lg:p-8 border border-slate-100 rounded-[1.5rem] lg:rounded-[2.5rem] bg-white space-y-6 lg:space-y-8 hover:shadow-xl transition-all duration-500">

//                                                     <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
//                                                         <div className="flex-1 space-y-4 lg:space-y-5">
//                                                             <div className="flex items-center gap-2">
//                                                                 <div className="h-3 w-1 bg-indigo-500 rounded-full" />
//                                                                 <h4 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Visual Identity</h4>
//                                                             </div>
//                                                             <div className="flex items-start gap-4 lg:gap-6">
//                                                                 <div className="flex flex-col items-center gap-2 shrink-0">
//                                                                     <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl border-4 border-white shadow-xl" style={{ backgroundColor: hexCode.startsWith('#') ? hexCode : `#${hexCode}` }} />
//                                                                     <Input className="w-20 lg:w-24 h-9 lg:h-10 rounded-lg text-[9px] font-mono uppercase bg-slate-50 border-none text-center" placeholder="#HEX" {...form.register(`variants.${index}.hex_code`)} />
//                                                                 </div>
//                                                                 <div className="flex-1">
//                                                                     <FormLabel className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Shade Designation</FormLabel>
//                                                                     <Input className="rounded-xl lg:rounded-2xl h-12 lg:h-14 bg-slate-50 border-none font-bold text-slate-900 text-sm lg:text-base focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="e.g. Midnight Velvet" {...form.register(`variants.${index}.title`)} />
//                                                                 </div>
//                                                             </div>
//                                                         </div>

//                                                         {/* MOBILE MEDIA LINKING */}
//                                                         <div className="w-full lg:w-48 space-y-4 lg:space-y-5">
//                                                             <div className="flex items-center gap-2">
//                                                                 <div className="h-3 w-1 bg-slate-200 rounded-full" />
//                                                                 <h4 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Media</h4>
//                                                             </div>
//                                                             <Dialog>
//                                                                 <DialogTrigger asChild>
//                                                                     <button type="button" className={`group relative w-full h-20 lg:h-24 rounded-[1.25rem] lg:rounded-[2rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-2 ${selectedImages.length > 0 ? 'border-indigo-600 bg-indigo-50/40 text-indigo-600 shadow-inner' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-400'}`}>
//                                                                         {selectedImages.length > 0 ? (
//                                                                             <><span className="text-xl lg:text-2xl font-black italic tracking-tighter leading-none">{selectedImages.length}</span><span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest opacity-70">Linked</span></>
//                                                                         ) : (
//                                                                             <><PlusCircle className="w-5 h-5 opacity-30" /><span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest">Assign Gallery</span></>
//                                                                         )}
//                                                                     </button>
//                                                                 </DialogTrigger>
//                                                                 <DialogContent className="!fixed !inset-0 !m-0 !p-0 !max-w-none !w-screen !h-screen border-none rounded-none flex flex-col bg-white z-[9999] overflow-hidden">
//                                                                     <div className="h-20 lg:h-28 px-6 lg:px-10 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
//                                                                         <div className="space-y-0.5">
//                                                                             <DialogTitle className="text-2xl lg:text-4xl font-black uppercase tracking-tighter italic text-slate-900 leading-none">Media Library</DialogTitle>
//                                                                             <span className="text-[9px] lg:text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">{selectedImages.length} Assets Linked</span>
//                                                                         </div>
//                                                                         <DialogClose asChild><Button variant="ghost" className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-slate-50"><X className="w-5 h-5 lg:w-6 lg:h-6" /></Button></DialogClose>
//                                                                     </div>
//                                                                     <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-[#fafafa] custom-scrollbar">
//                                                                         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8 w-full pb-32">
//                                                                             {previews.map((url, imgIndex) => {
//                                                                                 const selectedIdx = selectedImages.indexOf(url);
//                                                                                 const isSelected = selectedIdx !== -1;
//                                                                                 return (
//                                                                                     <button key={url} type="button" onClick={() => toggleVariantImage(index, url)} className="group relative w-full">
//                                                                                         <div className={`relative aspect-square rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden transition-all duration-500 ${isSelected ? 'ring-[6px] lg:ring-[10px] ring-indigo-600 ring-offset-2 lg:ring-offset-4 scale-[0.95]' : 'bg-white border border-slate-100'}`}>
//                                                                                             <img src={url} className={`w-full h-full object-cover ${isSelected ? 'brightness-[0.3]' : ''}`} alt="preview" />
//                                                                                             <AnimatePresence>
//                                                                                                 {isSelected && (
//                                                                                                     <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute inset-0 flex items-center justify-center">
//                                                                                                         <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-full bg-white flex items-center justify-center border-2 lg:border-[4px] border-indigo-600 shadow-xl">
//                                                                                                             <span className="text-lg lg:text-2xl font-black text-indigo-600 italic">{selectedIdx + 1}</span>
//                                                                                                         </div>
//                                                                                                     </motion.div>
//                                                                                                 )}
//                                                                                             </AnimatePresence>
//                                                                                         </div>
//                                                                                     </button>
//                                                                                 )
//                                                                             })}
//                                                                         </div>
//                                                                     </div>
//                                                                     <div className="h-24 lg:h-28 px-6 lg:px-10 border-t border-slate-100 bg-white flex items-center justify-end shrink-0">
//                                                                         <DialogClose asChild><Button className="w-full lg:w-auto px-10 h-12 lg:h-14 rounded-xl lg:rounded-2xl bg-slate-900 text-white text-[10px] lg:text-[11px] font-black uppercase tracking-[0.5em]">Update Workspace</Button></DialogClose>
//                                                                     </div>
//                                                                 </DialogContent>
//                                                             </Dialog>
//                                                         </div>

//                                                         <div className="absolute top-4 right-4 lg:top-8 lg:right-8">
//                                                             <Button type="button" variant="ghost" size="icon" onClick={() => remV(index)} className="text-slate-300 hover:text-rose-500 h-9 w-9 lg:h-12 lg:w-12"><Trash2 className="w-4 h-4 lg:w-5 lg:h-5" /></Button>
//                                                         </div>
//                                                     </div>

//                                                     <div className="pt-6 lg:pt-8 border-t border-slate-50">
//                                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
//                                                             <div className="space-y-1.5"><FormLabel className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-slate-400">Price</FormLabel><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₹</span><Input className="rounded-lg h-11 lg:h-12 font-bold text-slate-900 bg-slate-50/50 border-none pl-7" value={form.watch(`variants.${index}.price`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.price`, v))} /></div></div>
//                                                             <div className="space-y-1.5"><div className="flex justify-between items-center"><FormLabel className={`text-[8px] lg:text-[9px] font-black uppercase tracking-widest ${isLowStock ? 'text-rose-500' : ''}`}>Stock</FormLabel>{isLowStock && <AlertTriangle className="w-2.5 h-2.5 text-rose-500 animate-pulse" />}</div><Input className={`rounded-lg h-11 lg:h-12 font-black border-none px-3 ${isLowStock ? 'bg-rose-50 text-rose-600' : 'bg-slate-50/50'}`} value={form.watch(`variants.${index}.stock`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.stock`, v))} /></div>
//                                                             <div className="space-y-1.5"><FormLabel className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-slate-400">Discount</FormLabel><Select onValueChange={(v) => form.setValue(`variants.${index}.discount_type`, v as any)} value={form.watch(`variants.${index}.discount_type`)}><SelectTrigger className="h-11 lg:h-12 rounded-lg text-slate-900 bg-slate-50/50 border-none font-black text-[9px] uppercase"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Standard</SelectItem><SelectItem value="percentage">Percentage %</SelectItem><SelectItem value="amount">Fixed Amount</SelectItem></SelectContent></Select></div>
//                                                             <div className="space-y-1.5"><FormLabel className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-slate-400">Value</FormLabel><Input className="rounded-lg h-11 lg:h-12 text-slate-900 bg-slate-50/50 border-none px-3 font-bold" value={form.watch(`variants.${index}.discount_value`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.discount_value`, v))} /></div>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             )
//                                         })}
//                                         <Button type="button" variant="outline" className="w-full border-2 border-dashed border-slate-100 h-16 lg:h-20 rounded-[1.5rem] lg:rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/20" onClick={() => addV({ title: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#cbd5e1", variant_image_urls: [] })}><Plus className="w-4 h-4 mr-2" /> Append Shade</Button>
//                                     </div>
//                                 ) : (
//                                     <div className="py-16 lg:py-24 text-center border-2 border-dashed border-slate-50 rounded-[2rem] lg:rounded-[3rem] bg-slate-50/20"><p className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Inventory Mode: Standard Selection</p></div>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     </div>

//                     <div className="space-y-6">
//                         {/* MASTER INVENTORY */}
//                         {!hasVariants && (
//                             <Card className="rounded-[1.5rem] lg:rounded-[2rem] border-blue-100 bg-blue-50/20 shadow-sm">
//                                 <CardHeader className="bg-blue-50/50 border-b border-blue-100 p-4 lg:p-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-900 flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Global Pricing</CardTitle></CardHeader>
//                                 <CardContent className="space-y-4 pt-4 lg:pt-6 px-4 lg:px-6">
//                                     <FormLabel className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-slate-900">Retail Price</FormLabel>
//                                     <Input className="h-11 lg:h-12 rounded-xl bg-white border-blue-100 font-bold" type="text" value={form.watch("base_price")} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue("base_price", v))} />
//                                     <FormLabel className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-slate-900">Total Units</FormLabel>
//                                     <Input className="h-11 lg:h-12 rounded-xl bg-white border-blue-100 font-black" type="text" value={form.watch("stock")} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue("stock", v))} />
//                                 </CardContent>
//                             </Card>
//                         )}

//                         {/* MASTER GALLERY */}
//                         <Card className="rounded-[1.5rem] lg:rounded-[2rem] border-slate-200 shadow-sm overflow-hidden">
//                             <CardHeader className="bg-slate-50 border-b p-4 lg:p-6"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Media Assets</CardTitle></CardHeader>
//                             <CardContent className="space-y-4 pt-4 lg:pt-6 px-4 lg:px-6">
//                                 <input type="file" ref={fileInputRef} multiple className="hidden" accept="image/*" onChange={handleImageChange} />
//                                 <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-[1rem] lg:rounded-[1.5rem] border-slate-200 p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">
//                                     <Upload className="w-5 h-5 text-slate-400" />
//                                     <p className="text-[9px] lg:text-[10px] font-black uppercase mt-2 text-slate-400 italic tracking-widest">Import</p>
//                                 </div>
//                                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
//                                     <SortableContext items={previews} strategy={rectSortingStrategy}>
//                                         <div className="grid grid-cols-2 gap-2 lg:gap-3">
//                                             {previews.map((src, i) => <SortableImage key={src} url={src} index={i} onRemove={removeImage} />)}
//                                         </div>
//                                     </SortableContext>
//                                 </DndContext>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             </form>
//         </Form>
//     )
// }