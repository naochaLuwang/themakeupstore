
// "use client"

// import * as React from "react"
// import { useForm, useFieldArray, useWatch } from "react-hook-form"
// import { zodResolver } from "@hookform/resolvers/zod"
// import { productSchema, type ProductFormValues } from "@/lib/validations/product"
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { Switch } from "@/components/ui/switch"
// import { Textarea } from "@/components/ui/textarea"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { MultiSelect } from "@/components/ui/multi-select"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import {
//     Trash2, Plus, Upload, Info, Pipette, Loader2,
//     IndianRupee, CheckCircle2, Box, ArrowLeft, GripVertical
// } from "lucide-react"
// import { updateProduct } from "@/app/actions/products"
// import { toast } from "sonner"
// import { useRouter } from "next/navigation"
// import { Badge } from "@/components/ui/badge"

// // DND Kit Imports
// import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
// import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
// import { CSS } from "@dnd-kit/utilities"

// // --- SORTABLE IMAGE ITEM ---
// function SortableImage({ url, index, onRemove }: { url: string; index: number; onRemove: (i: number) => void }) {
//     const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
//     const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.3 : 1 }

//     return (
//         <div ref={setNodeRef} style={style} className="relative aspect-square rounded-[1.25rem] border border-slate-100 group overflow-hidden bg-slate-50 shadow-inner">
//             <img src={url} className="object-cover w-full h-full pointer-events-none" alt="gallery" />
//             <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity z-10">
//                 <GripVertical className="text-white w-6 h-6" />
//             </div>
//             <button type="button" onClick={() => onRemove(index)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors z-20 shadow-lg">
//                 <Trash2 className="w-4 h-4" />
//             </button>
//             {index === 0 && <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-md text-[8px] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest z-20">Cover</div>}
//             <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-[8px] text-slate-500 px-2 py-0.5 rounded-md font-bold z-20">{index + 1}</div>
//         </div>
//     )
// }

// interface ProductEditFormProps {
//     product: any
//     categories: { id: string; name: string }[]
// }

// export default function ProductEditForm({ product, categories }: ProductEditFormProps) {
//     const [mounted, setMounted] = React.useState(false)
//     const [previews, setPreviews] = React.useState<string[]>([])
//     const [isPending, setIsPending] = React.useState(false)
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
//             discount_type: "none", discount_value: 0, image_files: [], variants: []
//         }
//     })

//     const { fields: vFields, append: addV, remove: remV } = useFieldArray({ control: form.control, name: "variants" })
//     const hasVariants = useWatch({ control: form.control, name: "has_variants" })
//     const productSlug = form.watch("slug")

//     // 1. DATA INITIALIZATION & NORMALIZATION
//     React.useEffect(() => {
//         setMounted(true)
//         if (product) {
//             const defaultV = product.product_variants?.find((v: any) => v.is_default);

//             const normalizedVariants = product.product_variants
//                 ?.filter((v: any) => !v.is_default)
//                 .map((v: any) => ({
//                     ...v,
//                     price: Number(v.price) || 0,
//                     stock: Number(v.stock) || 0,
//                     discount_value: Number(v.discount_value) || 0,
//                     // Ensure this matches exactly what Supabase returns 
//                     // based on your query: select(..., product_variants(*, variant_images(*)))
//                     variant_image_urls: v.variant_images?.map((img: any) => img.url) || []
//                 })) || [];

//             form.reset({
//                 ...product,
//                 base_price: Number(product.base_price) || Number(defaultV?.price) || 0,
//                 stock: !product.has_variants
//                     ? (Number(defaultV?.stock) || 0)
//                     : product.product_variants?.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0),
//                 category_ids: product.product_categories?.map((c: any) => c.category_id) || [],
//                 variants: normalizedVariants
//             });

//             // Setup gallery previews
//             if (product.product_images) {
//                 const sortedImages = [...product.product_images].sort((a, b) => a.position - b.position)
//                 setPreviews(sortedImages.map((img: any) => img.url))
//             }
//         }
//     }, [product, form]);

//     // 2. LIVE SKU AUTOMATION
//     React.useEffect(() => {
//         const subscription = form.watch((value, { name }) => {
//             if (name?.startsWith("variants") && name?.endsWith("title")) {
//                 const index = parseInt(name.split(".")[1]);
//                 const title = value.variants?.[index]?.title;
//                 const currentSku = value.variants?.[index]?.sku;

//                 if (title && !currentSku) {
//                     const cleanTitle = title.toLowerCase().trim().replace(/\s+/g, '-');
//                     const generatedSku = `${productSlug || 'prod'}-${cleanTitle}`;
//                     form.setValue(`variants.${index}.sku`, generatedSku);
//                 }
//             }
//         });
//         return () => subscription.unsubscribe();
//     }, [form, productSlug]);

//     // 3. IMAGE LOGIC
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
//         if (urlToRemove.startsWith('blob:')) {
//             const currentFiles = form.getValues("image_files") || []
//             const blobIndex = previews.slice(0, index).filter(p => p.startsWith('blob:')).length
//             form.setValue("image_files", currentFiles.filter((_, i) => i !== blobIndex))
//             URL.revokeObjectURL(urlToRemove)
//         }
//         const variants = form.getValues("variants")
//         variants.forEach((v, vIdx) => {
//             if (v.variant_image_urls?.includes(urlToRemove)) {
//                 form.setValue(`variants.${vIdx}.variant_image_urls`, v.variant_image_urls.filter(u => u !== urlToRemove))
//             }
//         })
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

//     const toggleVariantImage = (vIdx: number, url: string) => {
//         const current = form.getValues(`variants.${vIdx}.variant_image_urls`) || []
//         const next = current.includes(url) ? current.filter(u => u !== url) : [...current, url]
//         form.setValue(`variants.${vIdx}.variant_image_urls`, next, {
//             shouldDirty: true,
//             shouldTouch: true
//         })
//     }

//     const handleNumberChange = (val: string, onChange: (v: number) => void) => {
//         const clean = val.replace(/[^0-9.]/g, "")
//         onChange(clean === "" ? 0 : parseFloat(clean))
//     }

//     async function onSubmit(values: ProductFormValues) {
//         setIsPending(true)
//         try {
//             const formData = new FormData()
//             const actualVariants = values.variants.map((v) => ({
//                 ...v,
//                 image_indices: (v.variant_image_urls || []).map(url => previews.indexOf(url)).filter(idx => idx !== -1)
//             }))
//             const { image_files, ...rest } = values
//             const payload = { ...rest, variants: actualVariants, existing_images: previews.filter(p => !p.startsWith('blob:')) }
//             formData.append("payload", JSON.stringify(payload))
//             values.image_files?.forEach((file: File) => formData.append("files", file))

//             const res = await updateProduct(product.id, formData)
//             if (res.success) {
//                 toast.success("Synchronized successfully")
//                 router.push("/admin/products")
//                 router.refresh()
//             } else toast.error(res.error)
//         } catch (e) { toast.error("Update failed") } finally { setIsPending(false) }
//     }

//     if (!mounted) return null

//     return (
//         <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-1">
//                 {/* HEADER */}
//                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 sticky top-0 bg-white/90 backdrop-blur-md z-30 pt-4">
//                     <div className="flex items-center gap-4">
//                         <Button type="button" variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
//                             <ArrowLeft className="w-5 h-5" />
//                         </Button>
//                         <h1 className="text-3xl font-black tracking-tighter uppercase">Edit Product</h1>
//                     </div>
//                     <div className="flex gap-3">
//                         <Button type="button" variant="outline" className="rounded-xl px-6 font-bold" onClick={() => router.back()}>Discard</Button>
//                         <Button type="submit" disabled={isPending} className="font-black min-w-[160px] rounded-xl bg-slate-900 shadow-lg text-white">
//                             {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
//                         </Button>
//                     </div>
//                 </div>

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//                     <div className="lg:col-span-2 space-y-6">
//                         {/* MAIN FIELDS */}
//                         <Card className="rounded-[2rem] border-slate-200">
//                             <CardHeader className="bg-slate-50 border-b p-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Core Attributes</CardTitle></CardHeader>
//                             <CardContent className="space-y-6 pt-6">
//                                 <div className="grid grid-cols-2 gap-6">
//                                     <FormField control={form.control} name="name" render={({ field }) => (
//                                         <FormItem><Input className="h-12 rounded-xl" placeholder="Title" {...field} /></FormItem>
//                                     )} />
//                                     <FormField control={form.control} name="brand" render={({ field }) => (
//                                         <FormItem><Input className="h-12 rounded-xl" placeholder="Brand" {...field} /></FormItem>
//                                     )} />
//                                 </div>
//                                 <FormField control={form.control} name="description" render={({ field }) => (
//                                     <FormItem><Textarea className="rounded-xl min-h-[120px]" placeholder="Description" {...field} value={field.value ?? ""} /></FormItem>
//                                 )} />
//                                 <FormField control={form.control} name="category_ids" render={({ field }) => (
//                                     <FormItem><MultiSelect options={categories.map(c => ({ label: c.name, value: c.id }))} selected={field.value || []} onChange={field.onChange} /></FormItem>
//                                 )} />
//                             </CardContent>
//                         </Card>

//                         {/* SHADE PALETTE */}
//                         <Card className={`rounded-[2rem] transition-all ${hasVariants ? "border-indigo-200 ring-4 ring-indigo-50" : "border-slate-200"}`}>
//                             <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
//                                 <CardTitle className="text-[10px] font-black uppercase text-indigo-500">Shade Palette</CardTitle>
//                                 <FormField control={form.control} name="has_variants" render={({ field }) => (
//                                     <Switch checked={field.value} onCheckedChange={(c) => { field.onChange(c); if (!c) form.setValue("variants", []); }} />
//                                 )} />
//                             </CardHeader>
//                             <CardContent className="pt-6">
//                                 {hasVariants ? (
//                                     <div className="space-y-4">
//                                         {vFields.map((field, index) => (
//                                             <VariantRow key={field.id} index={index} form={form} previews={previews} toggleVariantImage={toggleVariantImage} remV={remV} handleNumberChange={handleNumberChange} />
//                                         ))}
//                                         <Button type="button" variant="outline" className="w-full border-dashed h-14 rounded-[1.5rem] font-black" onClick={() => addV({ title: "", sku: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#000000", variant_image_urls: [] })}>
//                                             <Plus className="w-4 h-4 mr-2" /> Append Shade
//                                         </Button>
//                                     </div>
//                                 ) : (
//                                     <div className="py-16 text-center border-2 border-dashed rounded-[2rem] opacity-20"><Box className="w-10 h-10 mx-auto" /></div>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* SIDEBAR */}
//                     <div className="space-y-6">
//                         {!hasVariants && (
//                             <Card className="rounded-[2rem] border-blue-100 bg-blue-50/20">
//                                 <CardContent className="space-y-5 pt-6 p-6">
//                                     <FormField control={form.control} name="base_price" render={({ field }) => (
//                                         <FormItem><Input className="h-12 rounded-xl" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} placeholder="Price" /></FormItem>
//                                     )} />
//                                     <FormField control={form.control} name="stock" render={({ field }) => (
//                                         <FormItem><Input className="h-12 rounded-xl" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} placeholder="Stock" /></FormItem>
//                                     )} />
//                                 </CardContent>
//                             </Card>
//                         )}

//                         <Card className="rounded-[2.5rem] overflow-hidden">
//                             <CardContent className="space-y-4 pt-6 p-6">
//                                 <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleImageChange} />
//                                 <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center cursor-pointer hover:bg-slate-50">
//                                     <Plus className="w-6 h-6 text-indigo-500" />
//                                     <p className="text-[10px] font-black uppercase mt-4">Add Media</p>
//                                 </div>
//                                 <DndContext sensors={sensors} onDragEnd={handleDragEnd}><SortableContext items={previews} strategy={rectSortingStrategy}>
//                                     <div className="grid grid-cols-2 gap-4">
//                                         {previews.map((src, i) => <SortableImage key={src} url={src} index={i} onRemove={removeImage} />)}
//                                     </div>
//                                 </SortableContext></DndContext>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             </form>
//         </Form>
//     )
// }

// // Separate component for the variant row to use 'useWatch' properly
// function VariantRow({ index, form, previews, toggleVariantImage, remV, handleNumberChange }: any) {
//     const selectedImages = useWatch({
//         control: form.control,
//         name: `variants.${index}.variant_image_urls`
//     }) || [];

//     const hexCode = useWatch({
//         control: form.control,
//         name: `variants.${index}.hex_code`
//     }) || "#cbd5e1";

//     return (
//         <div className="p-6 border border-slate-100 rounded-[2rem] bg-white space-y-6 shadow-sm">
//             <div className="grid grid-cols-12 gap-4 items-end">
//                 <div className="col-span-1"><div className="w-10 h-10 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: hexCode }} /></div>
//                 <div className="col-span-4"><Input className="rounded-xl h-11" placeholder="Shade Name" {...form.register(`variants.${index}.title`)} /></div>
//                 <div className="col-span-3">
//                     <Dialog>
//                         <DialogTrigger asChild>
//                             <Button type="button" variant="outline" className="w-full h-11 rounded-xl text-[10px] font-black">
//                                 {selectedImages.length} Linked
//                             </Button>
//                         </DialogTrigger>
//                         <DialogContent className="rounded-[2.5rem] max-w-xl">
//                             <DialogHeader><DialogTitle className="font-black">Linked Media</DialogTitle></DialogHeader>
//                             <div className="grid grid-cols-3 gap-3 pt-4">
//                                 {previews.map((url: string) => {
//                                     const isSelected = selectedImages.includes(url);
//                                     return (
//                                         <button key={url} type="button" onClick={() => toggleVariantImage(index, url)} className={`relative aspect-square rounded-[1.5rem] border-2 transition-all ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-50 opacity-100' : 'opacity-40 grayscale'}`}>
//                                             <img src={url} className="w-full h-full object-cover rounded-[1.25rem]" />
//                                             {isSelected && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-indigo-500 bg-white rounded-full" />}
//                                         </button>
//                                     );
//                                 })}
//                             </div>
//                         </DialogContent>
//                     </Dialog>
//                 </div>
//                 <div className="col-span-3"><Input className="rounded-xl h-11 text-[10px]" placeholder="SKU" {...form.register(`variants.${index}.sku`)} /></div>
//                 <div className="col-span-1"><Button type="button" variant="ghost" onClick={() => remV(index)} className="text-red-300"><Trash2 className="w-4 h-4" /></Button></div>
//             </div>
//             <div className="grid grid-cols-4 gap-4 pt-4 border-t">
//                 <Input className="h-11 rounded-xl" value={form.watch(`variants.${index}.price`)} onChange={(e) => handleNumberChange(e.target.value, (v: any) => form.setValue(`variants.${index}.price`, v))} placeholder="Price" />
//                 <Input className="h-11 rounded-xl" value={form.watch(`variants.${index}.stock`)} onChange={(e) => handleNumberChange(e.target.value, (v: any) => form.setValue(`variants.${index}.stock`, v))} placeholder="Stock" />
//                 <Select onValueChange={(v) => form.setValue(`variants.${index}.discount_type`, v as any)} value={form.watch(`variants.${index}.discount_type`)}>
//                     <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
//                     <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="percentage">%</SelectItem><SelectItem value="amount">Fixed</SelectItem></SelectContent>
//                 </Select>
//                 <Input className="h-11 rounded-xl" value={form.watch(`variants.${index}.discount_value`)} onChange={(e) => handleNumberChange(e.target.value, (v: any) => form.setValue(`variants.${index}.discount_value`, v))} placeholder="Value" />
//             </div>
//         </div>
//     )
// }


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
    Trash2, Plus, Pipette, Loader2,
    CheckCircle2, Box, ArrowLeft, GripVertical
} from "lucide-react"
import { updateProduct } from "@/app/actions/products"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// DND Kit Imports
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// --- SORTABLE IMAGE ITEM ---
function SortableImage({ url, index, onRemove }: { url: string; index: number; onRemove: (i: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.3 : 1 }

    return (
        <div ref={setNodeRef} style={style} className="relative aspect-square rounded-[1.25rem] border border-slate-100 group overflow-hidden bg-slate-50 shadow-inner">
            <img src={url} className="object-cover w-full h-full pointer-events-none" alt="gallery" />
            <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity z-10">
                <GripVertical className="text-white w-6 h-6" />
            </div>
            <button type="button" onClick={() => onRemove(index)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors z-20 shadow-lg">
                <Trash2 className="w-4 h-4" />
            </button>
            {index === 0 && <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-md text-[8px] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest z-20">Cover</div>}
            <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-[8px] text-slate-500 px-2 py-0.5 rounded-md font-bold z-20">{index + 1}</div>
        </div>
    )
}

// --- VARIANT ROW COMPONENT ---
function VariantRow({ index, form, previews, toggleVariantImage, remV, handleNumberChange }: any) {
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
        <div className="p-6 border border-slate-100 rounded-[2rem] bg-white space-y-6 shadow-sm relative group">
            {/* Hidden SKU for database but kept in form state */}
            <input type="hidden" {...form.register(`variants.${index}.sku`)} />

            <div className="grid grid-cols-12 gap-4 items-center">
                {/* HEX PICKER */}
                <div className="col-span-2 md:col-span-1">
                    <div className="relative w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden" style={{ backgroundColor: hexCode }}>
                        <input type="color" {...form.register(`variants.${index}.hex_code`)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" />
                        <Pipette className="absolute inset-0 m-auto w-4 h-4 text-white mix-blend-difference pointer-events-none opacity-50" />
                    </div>
                </div>

                {/* SHADE NAME */}
                <div className="col-span-10 md:col-span-5">
                    <Input className="rounded-xl h-11 bg-slate-50/50 border-none font-bold" placeholder="Shade Name" {...form.register(`variants.${index}.title`)} />
                </div>

                {/* MEDIA LINKER */}
                <div className="col-span-8 md:col-span-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline" className={`w-full h-11 rounded-xl text-[10px] font-black transition-all ${selectedImages.length > 0 ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-dashed'}`}>
                                {selectedImages.length} Linked Media
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2.5rem] max-w-xl">
                            <DialogHeader><DialogTitle className="font-black uppercase">Link Shade Media</DialogTitle></DialogHeader>
                            <div className="grid grid-cols-3 gap-3 pt-4">
                                {previews.map((url: string) => {
                                    const isSelected = selectedImages.includes(url);
                                    return (
                                        <button key={url} type="button" onClick={() => toggleVariantImage(index, url)} className={`relative aspect-square rounded-[1.5rem] border-2 transition-all overflow-hidden ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-transparent opacity-100 '}`}>
                                            <img src={url} className="w-full h-full object-cover" />
                                            {isSelected && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-indigo-500 bg-white rounded-full" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* DELETE */}
                <div className="col-span-4 md:col-span-2 flex justify-end">
                    <Button type="button" variant="ghost" onClick={() => remV(index)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </div>
            </div>

            {/* SPECS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Price</label>
                    <Input className="h-11 rounded-xl bg-slate-50/50 border-none" value={form.watch(`variants.${index}.price`)} onChange={(e) => handleNumberChange(e.target.value, (v: any) => form.setValue(`variants.${index}.price`, v))} />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Stock</label>
                    <Input className="h-11 rounded-xl bg-slate-50/50 border-none" value={form.watch(`variants.${index}.stock`)} onChange={(e) => handleNumberChange(e.target.value, (v: any) => form.setValue(`variants.${index}.stock`, v))} />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Disc. Type</label>
                    <Select onValueChange={(v) => form.setValue(`variants.${index}.discount_type`, v as any)} value={form.watch(`variants.${index}.discount_type`)}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-none"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="percentage">%</SelectItem><SelectItem value="amount">Fixed</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Disc. Value</label>
                    <Input className="h-11 rounded-xl bg-slate-50/50 border-none" value={form.watch(`variants.${index}.discount_value`)} onChange={(e) => handleNumberChange(e.target.value, (v: any) => form.setValue(`variants.${index}.discount_value`, v))} />
                </div>
            </div>
        </div>
    )
}

// --- MAIN FORM ---
export default function ProductEditForm({ product, categories }: { product: any, categories: any[] }) {
    const [mounted, setMounted] = React.useState(false)
    const [previews, setPreviews] = React.useState<string[]>([])
    const [isPending, setIsPending] = React.useState(false)
    const router = useRouter()
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            name: "", slug: "", description: "", brand: "", has_variants: false, category_ids: [],
            base_price: 0, stock: 0, discount_type: "none", discount_value: 0, image_files: [], variants: []
        }
    })

    const { fields: vFields, append: addV, remove: remV } = useFieldArray({ control: form.control, name: "variants" })
    const hasVariants = useWatch({ control: form.control, name: "has_variants" })

    React.useEffect(() => {
        setMounted(true)
        if (product) {
            const defaultV = product.product_variants?.find((v: any) => v.is_default);
            const normalizedVariants = product.product_variants
                ?.filter((v: any) => !v.is_default)
                .map((v: any) => ({
                    ...v,
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
                variants: normalizedVariants
            });

            if (product.product_images) {
                setPreviews(product.product_images.sort((a: any, b: any) => a.position - b.position).map((img: any) => img.url))
            }
        }
    }, [product, form])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileArray = Array.from(e.target.files || [])
        form.setValue("image_files", [...(form.getValues("image_files") || []), ...fileArray])
        setPreviews(prev => [...prev, ...fileArray.map(f => URL.createObjectURL(f))])
    }

    const removeImage = (index: number) => {
        const url = previews[index]
        setPreviews(prev => prev.filter((_, i) => i !== index))
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
        form.setValue(`variants.${vIdx}.variant_image_urls`, next, { shouldDirty: true })
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
                toast.success("Synchronized successfully")
                router.push("/admin/products")
                router.refresh()
            } else toast.error(res.error)
        } catch (e) { toast.error("Error") } finally { setIsPending(false) }
    }

    if (!mounted) return null

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-1">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 sticky top-0 bg-white/90 backdrop-blur-md z-30 pt-4">
                    <div className="flex items-center gap-4">
                        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
                        <h1 className="text-3xl font-black tracking-tighter uppercase">Edit Product</h1>
                    </div>
                    <div className="flex gap-3">
                        <Button type="submit" disabled={isPending} className="font-black min-w-[160px] rounded-xl bg-slate-900 text-white shadow-lg">
                            {isPending ? <Loader2 className="animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="rounded-[2rem] border-slate-200">
                            <CardHeader className="bg-slate-50 border-b p-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Core Attributes</CardTitle></CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField control={form.control} name="name" render={({ field }) => <FormItem><Input className="h-12 rounded-xl" placeholder="Title" {...field} /></FormItem>} />
                                    <FormField control={form.control} name="slug" render={({ field }) => <FormItem><Input className="h-12 rounded-xl" placeholder="Slug" {...field} /></FormItem>} />
                                </div>
                                <FormField control={form.control} name="description" render={({ field }) => <FormItem><Textarea className="rounded-xl min-h-[120px]" placeholder="Description" {...field} value={field.value ?? ""} /></FormItem>} />
                                <FormField control={form.control} name="category_ids" render={({ field }) => <FormItem><MultiSelect options={categories.map(c => ({ label: c.name, value: c.id }))} selected={field.value || []} onChange={field.onChange} /></FormItem>} />
                            </CardContent>
                        </Card>

                        <Card className={`rounded-[2rem] transition-all ${hasVariants ? "border-indigo-200 ring-4 ring-indigo-50" : "border-slate-200"}`}>
                            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
                                <CardTitle className="text-[10px] font-black uppercase text-indigo-500">Shade Palette</CardTitle>
                                <FormField control={form.control} name="has_variants" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                            </CardHeader>
                            <CardContent className="pt-6">
                                {hasVariants ? (
                                    <div className="space-y-4">
                                        {vFields.map((field, index) => (
                                            <VariantRow key={field.id} index={index} form={form} previews={previews} toggleVariantImage={toggleVariantImage} remV={remV} handleNumberChange={(val: any, cb: any) => cb(val === "" ? 0 : parseFloat(val.replace(/[^0-9.]/g, "")))} />
                                        ))}
                                        <Button type="button" variant="outline" className="w-full border-dashed h-14 rounded-[1.5rem] font-black" onClick={() => addV({ title: "", sku: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#000000", variant_image_urls: [] })}>
                                            <Plus className="w-4 h-4 mr-2" /> Append Shade
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="py-16 text-center border-2 border-dashed rounded-[2rem] opacity-20"><Box className="w-10 h-10 mx-auto" /></div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {!hasVariants && (
                            <Card className="rounded-[2rem] border-blue-100 bg-blue-50/20 p-6 space-y-4">
                                <FormField control={form.control} name="base_price" render={({ field }) => <FormItem><Input className="h-12 rounded-xl" placeholder="Price" {...field} /></FormItem>} />
                                <FormField control={form.control} name="stock" render={({ field }) => <FormItem><Input className="h-12 rounded-xl" placeholder="Stock" {...field} /></FormItem>} />
                            </Card>
                        )}

                        <Card className="rounded-[2.5rem] overflow-hidden p-6 space-y-4">
                            <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleImageChange} />
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center cursor-pointer hover:bg-slate-50">
                                <Plus className="w-6 h-6 text-indigo-500" />
                                <p className="text-[10px] font-black uppercase mt-4">Add Media</p>
                            </div>
                            <DndContext sensors={sensors} onDragEnd={handleDragEnd}><SortableContext items={previews} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-2 gap-4">
                                    {previews.map((src, i) => <SortableImage key={src} url={src} index={i} onRemove={removeImage} />)}
                                </div>
                            </SortableContext></DndContext>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    )
}