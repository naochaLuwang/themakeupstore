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
    ChevronRight, X, PlusCircle, ArrowLeft 
} from "lucide-react"
import { updateProduct } from "@/app/actions/products"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { AnimatePresence, motion } from "framer-motion"

// DND Kit Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// --- SORTABLE IMAGE ITEM ---
function SortableImage({ url, index, onRemove }: { url: string; index: number; onRemove: (i: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.3 : 1 }

    return (
        <div ref={setNodeRef} style={style} className="relative aspect-square rounded-xl border border-slate-100 group overflow-hidden bg-slate-50 shadow-sm">
            <img src={url} className="object-cover w-full h-full pointer-events-none" alt="gallery" loading="lazy" />
            <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity z-10">
                <GripVertical className="text-white w-6 h-6 stroke-[1.5]" />
            </div>
            <button type="button" onClick={() => onRemove(index)} className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors z-20 shadow-sm">
                <Trash2 className="w-4 h-4 stroke-[1.5]" />
            </button>
            {index === 0 && <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-md text-xs text-white px-3 py-1 rounded-full font-semibold tracking-normal z-20">Cover</div>}
            <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-xs text-slate-500 px-2 py-0.5 rounded-md font-semibold z-20">{index + 1}</div>
        </div>
    )
}

// --- VARIANT ROW COMPONENT ---
function VariantRow({ index, form, previews, toggleVariantImage, remV, handleNumberChange }: any) {
    // We watch the specific variant's image list to update the UI button and bubbles
    const selectedImages = useWatch({ control: form.control, name: `variants.${index}.variant_image_urls` }) || [];
    const hexCode = useWatch({ control: form.control, name: `variants.${index}.hex_code` }) || "#cbd5e1";
    const title = useWatch({ control: form.control, name: `variants.${index}.title` });
    const productSlug = useWatch({ control: form.control, name: "slug" });

    // Auto-SKU Generation
    React.useEffect(() => {
        if (title) {
            const cleanTitle = title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const generatedSku = `${productSlug || 'prod'}-${cleanTitle}`;
            form.setValue(`variants.${index}.sku`, generatedSku, { shouldDirty: true });
        }
    }, [title, productSlug, index, form]);

    return (
        <div className="p-6 border border-slate-100 rounded-2xl bg-white space-y-6 shadow-sm relative group">
            <input type="hidden" {...form.register(`variants.${index}.sku`)} />

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-12 sm:items-center">
                {/* HEX PICKER */}
                <div className="col-span-1 sm:col-span-2 md:col-span-1">
                    <div className="relative w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden" style={{ backgroundColor: hexCode }}>
                        <input type="color" {...form.register(`variants.${index}.hex_code`)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" />
                        <Pipette className="absolute inset-0 m-auto w-4 h-4 text-white mix-blend-difference pointer-events-none opacity-50 stroke-[1.5]" />
                    </div>
                </div>

                {/* SHADE NAME */}
                <div className="col-span-1 sm:col-span-10 md:col-span-5">
                    <Input className="rounded-xl h-11 bg-white border-slate-200 font-semibold text-slate-900 min-w-0 font-normal" placeholder="Shade Name" {...form.register(`variants.${index}.title`)} />
                </div>

                {/* MEDIA LINKER */}
                <div className="col-span-1 sm:col-span-8 md:col-span-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className={`group relative w-full h-12 rounded-xl text-xs font-semibold tracking-normal transition-colors duration-200
                                ${selectedImages.length > 0 ? 'border-slate-200 bg-white text-slate-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500'}`}
                            >
                                <div className="flex items-center justify-center gap-3">
                                    {selectedImages.length > 0 ? (
                                        <>
                                            <div className="flex -space-x-2">
                                                {selectedImages.slice(0, 3).map((url: string, i: number) => (
                                                    <img key={i} src={url} className="w-5 h-5 rounded-full border-2 border-white object-cover" loading="lazy" />
                                                ))}
                                            </div>
                                            <span>{selectedImages.length} Linked</span>
                                        </>
                                    ) : (
                                        <>
                                            <PlusCircle className="w-4 h-4 opacity-50 stroke-[1.5]" />
                                            <span>Link Media Assets</span>
                                        </>
                                    )}
                                </div>
                            </Button>
                        </DialogTrigger>

                        <DialogContent
                            className="!fixed !inset-0 !m-0 !p-0 !max-w-none !w-screen !h-screen !translate-x-0 !translate-y-0 !top-0 !left-0 border-none rounded-none flex flex-col bg-white z-[9999] outline-none overflow-hidden"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                            {/* HEADER */}
                            <div className="h-20 px-4 sm:px-6 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
                                <div className="space-y-1">
                                    <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
                                        Media Library
                                    </DialogTitle>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-semibold text-slate-700 tracking-normal">
                                            Workspace Management • {selectedImages.length} Assets Linked
                                        </span>
                                    </div>
                                </div>

                                <DialogClose asChild>
                                    <Button variant="ghost" className="w-14 h-14 rounded-xl bg-slate-50 hover:bg-slate-900 hover:text-white transition-colors duration-300">
                                        <X className="w-6 h-6 stroke-[1.5]" />
                                    </Button>
                                </DialogClose>
                            </div>

                            {/* GRID */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 custom-scrollbar">
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-8 w-full pb-32">
                                    {previews.map((url: string) => {
                                        const selectedIdx = selectedImages.indexOf(url);
                                        const isSelected = selectedIdx !== -1;

                                        return (
                                            <button
                                                key={url}
                                                type="button"
                                                onClick={() => toggleVariantImage(index, url)}
                                                className="group relative w-full text-left"
                                            >
                                                <div className={`relative aspect-square rounded-2xl overflow-hidden transition-colors duration-200
                                                ${isSelected
                                                    ? 'ring-2 ring-pink-600 ring-offset-4 scale-[0.95] shadow-sm'
                                                    : 'hover:shadow-sm shadow-sm border border-slate-100'}`}
                                                >
                                                    <img
                                                        src={url}
                                                        className={`w-full h-full object-cover transition-colors duration-200
                                                        ${isSelected ? 'brightness-[0.3]' : ''}`}
                                                    />

                                                    <AnimatePresence>
                                                        {isSelected && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                                className="absolute inset-0 flex items-center justify-center"
                                                            >
                                                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-[4px] border-slate-200 shadow-sm">
                                                                    <span className="text-2xl font-semibold text-slate-700">
                                                                        {selectedIdx + 1}
                                                                    </span>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    {!isSelected && (
                                                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors flex items-center justify-center">
                                                            <div className="w-14 h-14 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-colors scale-90 flex items-center justify-center">
                                                                <Plus className="w-6 h-6 text-slate-700 stroke-[1.5]" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="h-20 px-4 sm:px-6 border-t border-slate-100 bg-white flex items-center justify-end shrink-0">
                                <DialogClose asChild>
                                    <Button className="w-full px-5 h-10 sm:w-auto rounded-xl bg-slate-900 text-white text-xs font-semibold tracking-normal hover:bg-slate-900 transition-colors shadow-sm active:scale-95">
                                        Update Selection
                                    </Button>
                                </DialogClose>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* DELETE */}
                <div className="col-span-1 flex justify-end sm:col-span-4 md:col-span-2">
                    <Button type="button" variant="ghost" onClick={() => remV(index)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4 stroke-[1.5]" /></Button>
                </div>
            </div>

            {/* SPECS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50 font-semibold">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Price</label>
                    <Input className="h-11 rounded-xl bg-white border-slate-200 text-slate-900 min-w-0 font-normal" value={form.watch(`variants.${index}.price`)} onChange={(e) => handleNumberChange(e.target.value, (v: any) => form.setValue(`variants.${index}.price`, v))} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Stock</label>
                    <Input className="h-11 rounded-xl bg-white border-slate-200 text-slate-900 min-w-0 font-normal" value={form.watch(`variants.${index}.stock`)} onChange={(e) => handleNumberChange(e.target.value, (v: any) => form.setValue(`variants.${index}.stock`, v))} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Disc. Type</label>
                    <Select onValueChange={(v) => form.setValue(`variants.${index}.discount_type`, v as any)} value={form.watch(`variants.${index}.discount_type`)}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-none text-slate-900"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="percentage">%</SelectItem><SelectItem value="amount">Fixed</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Disc. Value</label>
                    <Input className="h-11 rounded-xl bg-white border-slate-200 text-slate-900 min-w-0 font-normal" value={form.watch(`variants.${index}.discount_value`)} onChange={(e) => handleNumberChange(e.target.value, (v: any) => form.setValue(`variants.${index}.discount_value`, v))} />
                </div>
            </div>
        </div>
    )
}

// --- MAIN FORM COMPONENT ---
export default function ProductEditForm({ product, categories, concerns = [] }: { product: any, categories: any[], concerns?: { id: string, name: string }[] }) {
    const [mounted, setMounted] = React.useState(false)
    const [previews, setPreviews] = React.useState<string[]>([])
    const [isPending, setIsPending] = React.useState(false)
    const [isSuccess, setIsSuccess] = React.useState(false)
    const router = useRouter()
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: { name: "", slug: "", description: "", brand: "", tag: "", has_variants: false, category_ids: [], concern_ids: [], base_price: 0, stock: 0, discount_type: "none", discount_value: 0, image_files: [], variants: [] }
    })

    const { fields: vFields, append: addV, remove: remV } = useFieldArray({ control: form.control, name: "variants", keyName: "_rhfId" })
    const hasVariants = useWatch({ control: form.control, name: "has_variants" })

    React.useEffect(() => {
        setMounted(true)
        if (product) {
            const defaultV = product.product_variants?.find((v: any) => v.is_default);
            const normalizedVariants = product.product_variants
                ?.filter((v: any) => !v.is_default)
                .map((v: any) => ({
                    ...v,
                    id: v.id,
                    price: Number(v.price) || 0,
                    stock: Number(v.stock) || 0,
                    discount_value: Number(v.discount_value) || 0,
                    variant_image_urls: v.variant_images?.map((img: any) => img.url) || []
                })) || [];

            form.reset({
                ...product,
                base_price: Number(product.base_price) || Number(defaultV?.price) || 0,
                stock: !product.has_variants ? (Number(defaultV?.stock) || 0) : 0,
                category_ids: product.product_categories?.map((c: any) => c.category_id) || [],
                concern_ids: product.product_concerns?.map((c: any) => c.concern_id) || [],
                variants: normalizedVariants
            });

            if (product.product_images) {
                setPreviews(product.product_images.sort((a: any, b: any) => a.position - b.position).map((img: any) => img.url))
            }
        }
    }, [product, form])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileArray = Array.from(e.target.files || [])
        const currentFiles = form.getValues("image_files") || []
        form.setValue("image_files", [...currentFiles, ...fileArray])
        setPreviews(prev => [...prev, ...fileArray.map(f => URL.createObjectURL(f))])
    }

    const removeImage = (index: number) => {
        const url = previews[index]
        setPreviews(prev => prev.filter((_, i) => i !== index))
        
        // Clean variant links
        const variants = form.getValues("variants")
        variants.forEach((v, vIdx) => {
            if (v.variant_image_urls?.includes(url)) {
                form.setValue(`variants.${vIdx}.variant_image_urls`, v.variant_image_urls.filter(u => u !== url))
            }
        })
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

    const toggleVariantImage = (vIdx: number, url: string) => {
        const current = form.getValues(`variants.${vIdx}.variant_image_urls`) || []
        const next = current.includes(url) ? current.filter(u => u !== url) : [...current, url]
        form.setValue(`variants.${vIdx}.variant_image_urls`, next, { shouldDirty: true, shouldValidate: true })
    }

    const handleNumberChange = (val: string, onChange: (v: number) => void) => {
        const clean = val.replace(/[^0-9.]/g, "")
        onChange(clean === "" ? 0 : parseFloat(clean))
    }

    async function onSubmit(values: ProductFormValues) {
        setIsPending(true)
        try {
            const formData = new FormData()
            const actualVariants = values.variants.map((v) => ({
                ...v,
                image_indices: (v.variant_image_urls || []).map(url => previews.indexOf(url)).filter(idx => idx !== -1)
            }))
            const payload = { ...values, variants: actualVariants, existing_images: previews.filter(p => !p.startsWith('blob:')) }
            formData.append("payload", JSON.stringify(payload))
            values.image_files?.forEach((file: any) => formData.append("files", file))

            const res = await updateProduct(product.id, formData)
            if (res.success) {
                setIsSuccess(true)
                toast.success("Synchronized successfully")
                setTimeout(() => { router.push("/admin/products"); router.refresh() }, 1000)
            } else toast.error(res.error)
        } catch (e) { toast.error("Error") } finally { setIsPending(false) }
    }

    if (!mounted) return null

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-6">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 pt-4">
                    <div className="flex items-center gap-4">
                        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg"><ArrowLeft className="w-5 h-5 stroke-[1.5]" /></Button>
                        <div>
                            <h1 className="text-slate-900 text-xl font-semibold tracking-tight">Update Stock</h1>
                            <p className="text-xs font-semibold tracking-normal mt-1 text-slate-500">Inventory Management System</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="ghost" onClick={() => router.back()} className="rounded-xl font-semibold text-xs">Discard</Button>
                        <Button 
                            type="submit" 
                            disabled={isPending || isSuccess} 
                            className={`min-w-0 px-4 h-10 rounded-xl text-xs font-semibold transition-colors duration-300 flex items-center justify-center ${isSuccess ? "bg-emerald-700 text-white" : "bg-slate-900 text-white shadow-sm"}`}
                        >
                            {isPending ? <Loader2 className="animate-spin w-4 h-4 stroke-[1.5]" /> : isSuccess ? <CheckCircle2 className="w-4 h-4 stroke-[1.5]" /> : "Sync Changes"}
                        </Button>
                    </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="min-w-0 space-y-6 xl:col-span-2">
                        {/* CORE ATTRIBUTES */}
                        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden gap-0 py-0">
                            <CardHeader className="bg-slate-50 border-b p-4 sm:p-5"><CardTitle className="text-xs font-semibold text-slate-500">Core Attributes</CardTitle></CardHeader>
                            <CardContent className="space-y-6 p-4 sm:p-5">
                                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold tracking-normal text-slate-900">Public Title</FormLabel><FormControl><Input className="h-10 rounded-xl bg-white border-slate-200 font-semibold text-slate-900 min-w-0 font-normal" {...field} /></FormControl></FormItem>} />
                                    <FormField control={form.control} name="slug" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold tracking-normal text-slate-900">URL Segment</FormLabel><FormControl><Input className="h-10 rounded-xl bg-white border-slate-200 font-semibold text-slate-900 min-w-0 font-normal" {...field} /></FormControl></FormItem>} />
                                </div>
                                <FormField control={form.control} name="tag" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold tracking-normal text-slate-900">Tag (optional)</FormLabel><FormControl><Input placeholder="e.g. BESTSELLER, NEW, MINI" className="h-10 rounded-xl bg-white border-slate-200 font-semibold text-slate-900 min-w-0 font-normal" {...field} /></FormControl><FormDescription className="text-xs text-slate-500">Shown as badge on product card</FormDescription></FormItem>} />
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold tracking-normal text-slate-900">Product Narration</FormLabel>
                                        <FormControl><RichTextEditor value={field.value} onChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="category_ids" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold tracking-normal text-slate-900">Collections</FormLabel><FormControl><MultiSelect options={categories.map(c => ({ label: c.name, value: c.id }))} selected={field.value || []} onChange={field.onChange} /></FormControl></FormItem>} />
                            </CardContent>
                        </Card>

                        {/* SHADE PALETTE */}
                        <Card className={`rounded-2xl transition-colors duration-200  gap-0 py-0${hasVariants ? "border-slate-200 bg-slate-50/10 shadow-sm gap-0 py-0" : "border-slate-200 shadow-sm gap-0 py-0"} gap-0 py-0`}>
                            <CardHeader className="flex flex-row items-center justify-between border-b p-4 sm:p-5 bg-slate-50/50">
                                <CardTitle className="text-xs font-semibold text-slate-700">Shade Palette</CardTitle>
                                <FormField control={form.control} name="has_variants" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                            </CardHeader>
                            <CardContent className="p-4 sm:p-5">
                                {hasVariants ? (
                                    <div className="space-y-4">
                                        {vFields.map((field, index) => (
                                            <VariantRow key={field._rhfId} index={index} form={form} previews={previews} toggleVariantImage={toggleVariantImage} remV={remV} handleNumberChange={handleNumberChange} />
                                        ))}
                                        <Button type="button" variant="outline" className="w-full border-dashed h-14 rounded-xl font-semibold text-slate-500 text-xs hover:text-slate-700 transition-colors" onClick={() => addV({ title: "", sku: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#cbd5e1", variant_image_urls: [] })}>
                                            <Plus className="w-4 h-4 mr-2 stroke-[1.5]" /> Append Shade Option
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center border-2 border-dashed rounded-2xl bg-white/50"><p className="text-xs font-semibold text-slate-400">Default SKU Mode Active</p></div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {!hasVariants && (
                            <Card className="rounded-2xl border-blue-100 bg-blue-50/20 p-6 space-y-4 shadow-sm">
                                <FormField control={form.control} name="base_price" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold text-slate-900">Price</FormLabel><Input className="h-10 rounded-xl bg-white border-blue-100 font-semibold min-w-0 font-normal" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormItem>} />
                                <FormField control={form.control} name="stock" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold text-slate-900">Stock</FormLabel><Input className="h-10 rounded-xl bg-white border-blue-100 font-semibold min-w-0 font-normal" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormItem>} />
                            </Card>
                        )}

                        {/* MEDIA ASSETS */}
                        <Card className="rounded-2xl overflow-hidden border-slate-200 shadow-sm p-6 space-y-4">
                            <CardHeader className="p-0 pb-2"><CardTitle className="text-xs font-semibold text-slate-500">Media Assets</CardTitle></CardHeader>
                            <input type="file" ref={fileInputRef} multiple className="hidden" accept="image/*" onChange={handleImageChange} />
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center cursor-pointer hover:bg-slate-50 transition-colors group">
                                <Plus className="w-6 h-6 text-slate-500 group-hover:text-slate-700 transition-colors stroke-[1.5]" />
                                <p className="text-xs font-semibold mt-3 text-slate-500">Import Media</p>
                            </div>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={previews} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-2 gap-4">
                                        {previews.map((src, i) => <SortableImage key={src} url={src} index={i} onRemove={removeImage} />)}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </Card>

                        {/* CONCERNS */}
                        <Card className="rounded-2xl overflow-hidden border-slate-200 shadow-sm gap-0 py-0">
                            <CardHeader className="bg-slate-50 border-b p-4 sm:p-5">
                                <CardTitle className="text-xs font-semibold text-slate-500 tracking-normal">Concerns</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-1 max-h-[300px] overflow-y-auto">
                                {concerns.length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-4 font-medium">No concerns available</p>
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