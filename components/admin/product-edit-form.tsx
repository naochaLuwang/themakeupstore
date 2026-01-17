"use client"

import * as React from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, type ProductFormValues } from "@/lib/validations/product"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
    Trash2, Plus, Upload, Info, Pipette, Loader2,
    IndianRupee, CheckCircle2, Box, ArrowLeft, Tag,
    GripVertical
} from "lucide-react"
import { updateProduct } from "@/app/actions/products"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

// DND Kit Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// --- SORTABLE IMAGE ITEM ---
function SortableImage({ url, index, onRemove }: { url: string; index: number; onRemove: (i: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.3 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className="relative aspect-square rounded-[1.25rem] border border-slate-100 group overflow-hidden bg-slate-50 shadow-inner">
            <img src={url} className="object-cover w-full h-full pointer-events-none" alt="gallery" />

            {/* Drag Handle Overlay */}
            <div
                {...attributes}
                {...listeners}
                className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity z-10"
            >
                <GripVertical className="text-white w-6 h-6" />
            </div>

            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(index);
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors z-20 shadow-lg"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            {index === 0 && (
                <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-md text-[8px] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-xl z-20">
                    Cover
                </div>
            )}

            <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-[8px] text-slate-500 px-2 py-0.5 rounded-md font-bold z-20">
                {index + 1}
            </div>
        </div>
    )
}

interface ProductEditFormProps {
    product: any
    categories: { id: string; name: string }[]
}

export default function ProductEditForm({ product, categories }: ProductEditFormProps) {
    const [mounted, setMounted] = React.useState(false)
    const [previews, setPreviews] = React.useState<string[]>([])
    const [isPending, setIsPending] = React.useState(false)
    const router = useRouter()
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // DND Sensors Configuration
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 } // Critical: allows buttons to be clicked without starting a drag
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // 1. DATA NORMALIZATION
    const defaultVariant = product.product_variants?.find((v: any) => v.is_default);

    const initialTotalStock = React.useMemo(() => {
        if (product.has_variants) {
            return product.product_variants?.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0) || 0;
        }
        return Number(defaultVariant?.stock) || 0;
    }, [product, defaultVariant]);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            name: product.name || "",
            slug: product.slug || "",
            description: product.description || "",
            brand: product.brand || "",
            has_variants: !!product.has_variants,
            category_ids: product.product_categories?.map((c: any) => c.category_id) || [],
            base_price: Number(product.base_price) || Number(defaultVariant?.price) || 0,
            stock: initialTotalStock,
            discount_type: (product.discount_type as any) || (defaultVariant?.discount_type) || "none",
            discount_value: Number(product.discount_value) || Number(defaultVariant?.discount_value) || 0,
            variants: product.product_variants
                ?.filter((v: any) => !v.is_default)
                .map((v: any) => ({
                    id: v.id,
                    title: v.title || "",
                    sku: v.sku || "",
                    price: Number(v.price) || 0,
                    stock: Number(v.stock) || 0,
                    hex_code: v.hex_code || "#000000",
                    discount_type: v.discount_type || "none",
                    discount_value: Number(v.discount_value) || 0,
                    variant_image_urls: v.variant_images?.map((vi: any) => vi.url) || [],
                })) || [],
            image_files: [],
            existing_images: product.product_images || [],
        }
    });

    const { fields: vFields, append: addV, remove: remV } = useFieldArray({
        control: form.control,
        name: "variants"
    })

    // 2. REAL-TIME STOCK SYNC
    const hasVariants = useWatch({ control: form.control, name: "has_variants" });
    const watchedVariants = useWatch({ control: form.control, name: "variants" });

    React.useEffect(() => {
        if (hasVariants && watchedVariants) {
            const newTotal = watchedVariants.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
            form.setValue("stock", newTotal);
        }
    }, [watchedVariants, hasVariants, form]);

    React.useEffect(() => {
        setMounted(true)
        if (product.product_images) {
            // Ensure images are sorted by their position column from Supabase
            const sortedImages = [...product.product_images].sort((a, b) => a.position - b.position)
            setPreviews(sortedImages.map((img: any) => img.url))
        }
    }, [product])

    const handleNumberChange = (val: string, onChange: (v: number) => void) => {
        const clean = val.replace(/[^0-9.]/g, "")
        onChange(clean === "" ? 0 : parseFloat(clean))
    }

    // 3. UPDATED IMAGE HANDLERS (DND SYNCED)
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        const fileArray = Array.from(files)
        const currentFiles = form.getValues("image_files") || []

        // Append new files to the form state
        form.setValue("image_files", [...currentFiles, ...fileArray])

        // Append new object URLs to the preview list
        const newPreviews = fileArray.map(file => URL.createObjectURL(file))
        setPreviews(prev => [...prev, ...newPreviews])
    }

    const removeImage = (index: number) => {
        const urlToRemove = previews[index]
        const isNewUpload = urlToRemove.startsWith('blob:')

        // 1. Remove from local preview state
        const updatedPreviews = previews.filter((_, i) => i !== index)
        setPreviews(updatedPreviews)

        // 2. If it was a new upload, remove from the File array
        if (isNewUpload) {
            const currentFiles = form.getValues("image_files") || []
            // Calculate index relative to other new uploads
            const newUploadsBeforeThis = previews.slice(0, index).filter(p => p.startsWith('blob:')).length
            form.setValue("image_files", currentFiles.filter((_, i) => i !== newUploadsBeforeThis))
        }

        // 3. Cleanup variant links
        const variants = form.getValues("variants")
        variants.forEach((v, vIdx) => {
            if (v.variant_image_urls?.includes(urlToRemove)) {
                form.setValue(`variants.${vIdx}.variant_image_urls`, v.variant_image_urls.filter(u => u !== urlToRemove))
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

    const toggleVariantImage = (variantIndex: number, url: string) => {
        const current = form.getValues(`variants.${variantIndex}.variant_image_urls`) || []
        const next = current.includes(url) ? current.filter(u => u !== url) : [...current, url]
        form.setValue(`variants.${variantIndex}.variant_image_urls`, next)
    }

    async function onSubmit(values: ProductFormValues) {
        setIsPending(true)
        try {
            const formData = new FormData()
            const { image_files, ...rest } = values

            // Map image URLs back to their new index after dragging
            const cleanedVariants = values.variants.map((v) => ({
                ...v,
                image_indices: (v.variant_image_urls || [])
                    .map(url => previews.indexOf(url))
                    .filter(idx => idx !== -1)
            }))

            const payload = {
                ...rest,
                variants: cleanedVariants,
                // Only send back the URLs that exist in Supabase (not local blobs)
                existing_images: previews.filter(p => !p.startsWith('blob:'))
            }

            formData.append("payload", JSON.stringify(payload))

            // Append newly uploaded files
            values.image_files?.forEach((file: File) => {
                formData.append("files", file)
            })

            const res = await updateProduct(product.id, formData)
            if (res.success) {
                toast.success("Product synchronized successfully")
                router.push("/admin/products")
                router.refresh()
            } else toast.error(res.error)
        } catch (e) {
            toast.error("Update failed")
        } finally {
            setIsPending(false)
        }
    }

    if (!mounted) return null

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-1">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 sticky top-0 bg-white/90 backdrop-blur-md z-30 pt-4">
                    <div className="flex items-center gap-4">
                        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-black tracking-tighter uppercase">Edit Product</h1>
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 px-3 py-1 rounded-full text-xs font-bold">
                                    {form.watch("stock")} units in stock
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-xs font-mono mt-1">{product.id}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" className="rounded-xl px-6 font-bold" onClick={() => router.back()}>Discard</Button>
                        <Button type="submit" disabled={isPending} className="font-black min-w-[160px] rounded-xl bg-slate-900 shadow-lg text-white">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Records"}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* CORE INFO */}
                        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 border-b p-6">
                                <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest text-slate-400"><Info className="w-4 h-4" /> Attributes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[10px] uppercase font-black">Title</FormLabel><FormControl><Input className="h-12 rounded-xl focus-visible:ring-indigo-500" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="brand" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[10px] uppercase font-black">Brand</FormLabel><FormControl><Input className="h-12 rounded-xl focus-visible:ring-indigo-500" {...field} /></FormControl></FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] uppercase font-black">Narration</FormLabel><FormControl><Textarea className="rounded-xl min-h-[120px] focus-visible:ring-indigo-500" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="category_ids" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] uppercase font-black">Collections</FormLabel>
                                        <MultiSelect options={categories.map(c => ({ label: c.name, value: c.id }))} selected={field.value || []} onChange={field.onChange} />
                                    </FormItem>
                                )} />
                            </CardContent>
                        </Card>

                        {/* VARIANTS SECTION */}
                        <Card className={`rounded-[2rem] overflow-hidden transition-all duration-300 ${hasVariants ? "border-indigo-200 ring-4 ring-indigo-50" : "border-slate-200"}`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-slate-50/50 p-6">
                                <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest text-indigo-500"><Pipette className="w-4 h-4" /> Shade Palette</CardTitle>
                                <FormField control={form.control} name="has_variants" render={({ field }) => (
                                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border shadow-sm">
                                        <span className="text-[9px] uppercase font-black text-slate-500 tracking-tight">Variants Enabled</span>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </div>
                                )} />
                            </CardHeader>
                            <CardContent className="pt-6">
                                {hasVariants ? (
                                    <div className="space-y-4">
                                        {vFields.map((field, index) => {
                                            const selectedImages = form.watch(`variants.${index}.variant_image_urls`) || [];
                                            return (
                                                <div key={field.id} className="p-6 border border-slate-100 rounded-[2rem] bg-white space-y-6 hover:border-indigo-100 transition-colors shadow-sm">
                                                    <div className="grid grid-cols-12 gap-4 items-end">
                                                        <div className="col-span-1">
                                                            <div className="w-10 h-10 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: form.watch(`variants.${index}.hex_code`) || '#cbd5e1' }} />
                                                        </div>
                                                        <div className="col-span-4">
                                                            <FormLabel className="text-[9px] font-black uppercase text-slate-400">Shade Name</FormLabel>
                                                            <Input className="rounded-xl h-11 font-bold" {...form.register(`variants.${index}.title`)} />
                                                        </div>
                                                        <div className="col-span-3">
                                                            <FormLabel className="text-[9px] font-black uppercase text-slate-400 text-center block mb-1">Linked Media</FormLabel>
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button type="button" variant="outline" className="w-full h-11 rounded-xl border-dashed text-[10px] font-black uppercase">{selectedImages.length} Images</Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="rounded-[2.5rem] max-w-xl">
                                                                    <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Select Shade Gallery</DialogTitle></DialogHeader>
                                                                    <div className="grid grid-cols-3 gap-3 pt-4">
                                                                        {previews.map((url, i) => (
                                                                            <button key={url} type="button" onClick={() => toggleVariantImage(index, url)} className={`relative aspect-square rounded-[1.5rem] border-2 overflow-hidden transition-all ${selectedImages.includes(url) ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-transparent opacity-40 grayscale'}`}>
                                                                                <img src={url} className="w-full h-full object-cover" alt="preview" />
                                                                                {selectedImages.includes(url) && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-indigo-500 bg-white rounded-full shadow-sm" />}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                        <div className="col-span-3">
                                                            <FormLabel className="text-[9px] font-black uppercase text-slate-400">SKU / Hex</FormLabel>
                                                            <div className="flex gap-2">
                                                                <Input className="rounded-xl h-11 text-[10px] font-mono" placeholder="SKU" {...form.register(`variants.${index}.sku`)} />
                                                                <Input className="rounded-xl h-11 w-20 text-[10px] font-mono uppercase" placeholder="#HEX" {...form.register(`variants.${index}.hex_code`)} />
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => remV(index)} className="text-red-300 hover:text-red-500 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-50">
                                                        <div><FormLabel className="text-[9px] font-black uppercase text-slate-400">Price</FormLabel><Input className="rounded-xl h-11 font-bold" value={form.watch(`variants.${index}.price`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.price`, v))} /></div>
                                                        <div><FormLabel className="text-[9px] font-black uppercase text-slate-400">Stock</FormLabel><Input className="rounded-xl h-11 font-black text-indigo-600 border-indigo-100" value={form.watch(`variants.${index}.stock`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.stock`, v))} /></div>
                                                        <div>
                                                            <FormLabel className="text-[9px] font-black uppercase text-slate-400">Discount</FormLabel>
                                                            <Select onValueChange={(v) => form.setValue(`variants.${index}.discount_type`, v as any)} value={form.watch(`variants.${index}.discount_type`)}>
                                                                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                                                <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="percentage">% Off</SelectItem><SelectItem value="amount">Fixed</SelectItem></SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div><FormLabel className="text-[9px] font-black uppercase text-slate-400">Value</FormLabel><Input className="rounded-xl h-11" value={form.watch(`variants.${index}.discount_value`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.discount_value`, v))} /></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <Button type="button" variant="outline" className="w-full border-dashed border-slate-300 h-14 rounded-[1.5rem] font-black text-xs uppercase text-slate-400 hover:text-indigo-500 transition-all" onClick={() => addV({ title: "", sku: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#000000", variant_image_urls: [] })}>
                                            <Plus className="w-4 h-4 mr-2" /> Append Shade
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center">
                                        <Box className="w-10 h-10 mb-3 opacity-10 text-slate-900" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Default Single Mode</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* SIDEBAR */}
                    <div className="space-y-6">
                        {!hasVariants && (
                            <Card className="rounded-[2rem] border-blue-100 bg-blue-50/20 shadow-sm">
                                <CardHeader className="bg-blue-50 border-b border-blue-100 p-6"><CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-tight text-blue-900"><IndianRupee className="w-4 h-4" /> Pricing & Stock</CardTitle></CardHeader>
                                <CardContent className="space-y-5 pt-6 p-6">
                                    <FormField control={form.control} name="base_price" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[9px] uppercase font-black text-blue-400">Rate (INR)</FormLabel><FormControl><Input className="h-12 rounded-xl bg-white border-blue-100 font-bold" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="stock" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[9px] uppercase font-black text-blue-400">Total Units</FormLabel><FormControl><Input className="h-12 rounded-xl bg-white border-blue-100 font-bold" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormControl></FormItem>
                                    )} />
                                    <div className="pt-4 border-t border-blue-100 space-y-4">
                                        <h4 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest"><Tag className="w-3 h-3" /> Offer Details</h4>
                                        <FormField control={form.control} name="discount_type" render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-11 rounded-xl bg-white border-blue-100"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="none">Regular</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="amount">Fixed</SelectItem></SelectContent>
                                            </Select>
                                        )} />
                                        <FormField control={form.control} name="discount_value" render={({ field }) => (
                                            <Input className="h-11 rounded-xl bg-white border-blue-100" placeholder="Value" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} />
                                        )} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* REORDERABLE MEDIA GALLERY */}
                        <Card className="rounded-[2.5rem] overflow-hidden border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50 border-b p-6">
                                <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest text-slate-400">
                                    <Upload className="w-4 h-4" /> Media Gallery
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6 p-6">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    multiple
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed rounded-[2rem] border-slate-200 p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-4">
                                        Add Content
                                    </p>
                                </div>

                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={previews} strategy={rectSortingStrategy}>
                                        <div className="grid grid-cols-2 gap-4">
                                            {previews.map((src, i) => (
                                                <SortableImage
                                                    key={src}
                                                    url={src}
                                                    index={i}
                                                    onRemove={removeImage}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>

                                <p className="text-[9px] text-center text-slate-400 font-black uppercase tracking-widest pt-4 border-t border-slate-50">
                                    Drag items to reorder
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    )
}

