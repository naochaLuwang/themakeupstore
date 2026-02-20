
// "use client"

// import * as React from "react"
// import { useForm, useFieldArray } from "react-hook-form"
// import { zodResolver } from "@hookform/resolvers/zod"
// import { productSchema, type ProductFormValues } from "@/lib/validations/product"
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { Switch } from "@/components/ui/switch"
// import { Textarea } from "@/components/ui/textarea"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { MultiSelect } from "@/components/ui/multi-select"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { Trash2, Plus, Upload, Info, Pipette, Loader2, IndianRupee, CheckCircle2, Tag, GripVertical } from "lucide-react"
// import { createProduct, updateProduct } from "@/app/actions/products"
// import { toast } from "sonner"
// import { useRouter } from "next/navigation"

// // DND Kit Imports
// import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
// import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
// import { CSS } from "@dnd-kit/utilities"

// // --- SORTABLE IMAGE ITEM ---
// function SortableImage({ url, index, onRemove }: { url: string; index: number; onRemove: (i: number) => void }) {
//     const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })

//     const style = {
//         transform: CSS.Transform.toString(transform),
//         transition,
//         zIndex: isDragging ? 50 : 1,
//         opacity: isDragging ? 0.3 : 1,
//     }

//     return (
//         <div ref={setNodeRef} style={style} className="relative aspect-square rounded-[1.25rem] border border-slate-100 group overflow-hidden bg-slate-50 shadow-inner">
//             <img src={url} className="object-cover w-full h-full pointer-events-none" alt="gallery" />

//             {/* Drag Handle Overlay */}
//             <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
//                 <GripVertical className="text-white w-6 h-6" />
//             </div>

//             <button
//                 type="button"
//                 onClick={(e) => { e.stopPropagation(); onRemove(index); }}
//                 className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors z-20"
//             >
//                 <Trash2 className="w-4 h-4" />
//             </button>

//             {index === 0 && (
//                 <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-md text-[8px] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-xl">
//                     Cover
//                 </div>
//             )}
//             <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-[8px] text-slate-500 px-2 py-0.5 rounded-md font-bold">
//                 {index + 1}
//             </div>
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
//     const router = useRouter()
//     const fileInputRef = React.useRef<HTMLInputElement>(null)

//     // DND Sensors
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

//     // 1. DATA INITIALIZATION
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
//             if (initialData.product_images) {
//                 setPreviews(initialData.product_images.map((img: any) => img.url))
//             }
//         }
//     }, [initialData, form])

//     // 2. AUTO-SLUG
//     const nameWatch = form.watch("name")
//     React.useEffect(() => {
//         if (nameWatch && !isEdit) {
//             const generatedSlug = nameWatch.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
//             form.setValue("slug", generatedSlug, { shouldValidate: true });
//         }
//     }, [nameWatch, form, isEdit]);

//     // 3. IMAGE HANDLERS
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

//         // Unlink from variants
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
//         form.setValue(`variants.${vIdx}.variant_image_urls`, next)
//     }

//     const handleNumberChange = (val: string, onChange: (v: number) => void) => {
//         const clean = val.replace(/[^0-9.]/g, "")
//         onChange(clean === "" ? 0 : parseFloat(clean))
//     }

//     async function onSubmit(values: ProductFormValues) {
//         setIsPending(true)
//         try {
//             const formData = new FormData()
//             const actualVariants = values.has_variants ? values.variants.map((v) => ({
//                 ...v,
//                 image_indices: (v.variant_image_urls || []).map(url => previews.indexOf(url)).filter(idx => idx !== -1)
//             })) : [];

//             const { image_files, ...rest } = values
//             const payload = { ...rest, variants: actualVariants, existing_images: previews.filter(p => !p.startsWith('blob:')) }
//             formData.append("payload", JSON.stringify(payload))
//             values.image_files?.forEach((file: File) => formData.append("files", file))

//             const res = isEdit ? await updateProduct(initialData.id, formData) : await createProduct(formData)
//             if (res.success) {
//                 toast.success(isEdit ? "Product updated" : "Product created")
//                 router.push("/admin/products")
//                 router.refresh()
//             } else toast.error(res.error)
//         } catch (e) { toast.error("Submission failed") } finally { setIsPending(false) }
//     }

//     if (!mounted) return null

//     return (
//         <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-1">
//                 {/* HEADER */}
//                 <div className="flex items-center justify-between border-b pb-6">
//                     <div>
//                         <h1 className="text-3xl font-black tracking-tighter uppercase">{isEdit ? "Update Item" : "New Collection"}</h1>
//                         <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">Inventory Management System</p>
//                     </div>
//                     <div className="flex gap-3">
//                         <Button type="button" variant="ghost" onClick={() => router.back()} className="rounded-xl font-bold uppercase text-[10px]">Back</Button>
//                         <Button type="submit" disabled={isPending} className="font-black min-w-[160px] rounded-xl bg-slate-900 shadow-xl text-[11px] uppercase tracking-wider">
//                             {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEdit ? "Sync Changes" : "Create Product")}
//                         </Button>
//                     </div>
//                 </div>

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//                     <div className="lg:col-span-2 space-y-6">
//                         {/* BASIC DETAILS */}
//                         <Card className="rounded-[2rem] border-slate-200">
//                             <CardHeader className="bg-slate-50 border-b">
//                                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Info className="w-4 h-4" /> Identification</CardTitle>
//                             </CardHeader>
//                             <CardContent className="space-y-6 pt-6">
//                                 <div className="grid grid-cols-2 gap-6">
//                                     <FormField control={form.control} name="name" render={({ field }) => (
//                                         <FormItem><FormLabel className="text-[10px] font-black uppercase">Product Title</FormLabel><FormControl><Input className="rounded-xl h-12" {...field} /></FormControl><FormMessage /></FormItem>
//                                     )} />
//                                     <FormField control={form.control} name="brand" render={({ field }) => (
//                                         <FormItem><FormLabel className="text-[10px] font-black uppercase">Brand Name</FormLabel><FormControl><Input className="rounded-xl h-12" {...field} /></FormControl></FormItem>
//                                     )} />
//                                 </div>
//                                 <FormField control={form.control} name="description" render={({ field }) => (
//                                     <FormItem><FormLabel className="text-[10px] font-black uppercase">Narration</FormLabel><FormControl><Textarea className="rounded-xl min-h-[120px]" {...field} value={field.value ?? ""} /></FormControl></FormItem>
//                                 )} />
//                                 <FormField control={form.control} name="category_ids" render={({ field }) => (
//                                     <FormItem><FormLabel className="text-[10px] font-black uppercase">Collections</FormLabel><MultiSelect options={categories.map(c => ({ label: c.name, value: c.id }))} selected={field.value || []} onChange={field.onChange} /></FormItem>
//                                 )} />
//                             </CardContent>
//                         </Card>

//                         {/* SHADES/VARIANTS */}
//                         <Card className={`rounded-[2rem] transition-all duration-300 ${hasVariants ? "border-indigo-200 bg-indigo-50/5 shadow-inner" : "border-slate-200"}`}>
//                             <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
//                                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2"><Pipette className="w-4 h-4" /> Shade Palette</CardTitle>
//                                 <FormField control={form.control} name="has_variants" render={({ field }) => (
//                                     <div className="flex items-center gap-3 bg-white p-2 rounded-full border shadow-sm px-4">
//                                         <span className="text-[9px] font-black uppercase text-slate-500">Enable Variations</span>
//                                         <Switch checked={field.value} onCheckedChange={(c) => { field.onChange(c); if (!c) form.setValue("variants", []); else if (vFields.length === 0) addV({ title: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#000000", variant_image_urls: [] }); }} />
//                                     </div>
//                                 )} />
//                             </CardHeader>
//                             <CardContent className="pt-6">
//                                 {hasVariants ? (
//                                     <div className="space-y-4">
//                                         {vFields.map((field, index) => {
//                                             const selectedImages = form.watch(`variants.${index}.variant_image_urls`) || [];
//                                             return (
//                                                 <div key={field.id} className="p-6 border border-slate-100 rounded-[2rem] bg-white space-y-6 hover:shadow-md transition-shadow">
//                                                     <div className="grid grid-cols-12 gap-4 items-end">
//                                                         <div className="col-span-1 flex flex-col items-center">
//                                                             <div className="w-10 h-10 rounded-full border-2 border-white shadow-md mb-2" style={{ backgroundColor: form.watch(`variants.${index}.hex_code`) || '#e2e8f0' }} />
//                                                         </div>
//                                                         <div className="col-span-4">
//                                                             <FormLabel className="text-[9px] font-black uppercase">Shade Name</FormLabel>
//                                                             <Input className="rounded-xl h-11" {...form.register(`variants.${index}.title`)} />
//                                                             <FormMessage />
//                                                         </div>
//                                                         <div className="col-span-3">
//                                                             <FormLabel className="text-[9px] font-black uppercase text-slate-400">Linked Media</FormLabel>
//                                                             <Dialog>
//                                                                 <DialogTrigger asChild>
//                                                                     <Button type="button" variant="outline" className="w-full h-11 border-dashed rounded-xl text-[10px] font-black uppercase">{selectedImages.length} Images</Button>
//                                                                 </DialogTrigger>
//                                                                 <DialogContent className="rounded-[2.5rem]">
//                                                                     <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Gallery Mapping</DialogTitle></DialogHeader>
//                                                                     <div className="grid grid-cols-3 gap-3 pt-4">
//                                                                         {previews.map((url, i) => (
//                                                                             <button key={i} type="button" onClick={() => toggleVariantImage(index, url)} className={`relative aspect-square rounded-2xl border-2 overflow-hidden ${selectedImages.includes(url) ? 'border-indigo-500 shadow-lg' : 'border-transparent opacity-40 grayscale'}`}>
//                                                                                 <img src={url} className="w-full h-full object-cover" alt="preview" />
//                                                                                 {selectedImages.includes(url) && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-indigo-500 bg-white rounded-full shadow-sm" />}
//                                                                             </button>
//                                                                         ))}
//                                                                     </div>
//                                                                 </DialogContent>
//                                                             </Dialog>
//                                                         </div>
//                                                         <div className="col-span-3">
//                                                             <FormLabel className="text-[9px] font-black uppercase">Hex Code</FormLabel>
//                                                             <Input className="rounded-xl h-11 font-mono uppercase" {...form.register(`variants.${index}.hex_code`)} />
//                                                         </div>
//                                                         <div className="col-span-1">
//                                                             <Button type="button" variant="ghost" size="icon" onClick={() => remV(index)} className="text-red-400 hover:text-red-600 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
//                                                         </div>
//                                                     </div>
//                                                     <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-50">
//                                                         <div><FormLabel className="text-[9px] font-black uppercase">Price</FormLabel><Input className="rounded-xl h-11 font-bold" value={form.watch(`variants.${index}.price`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.price`, v))} /></div>
//                                                         <div><FormLabel className="text-[9px] font-black uppercase">Stock</FormLabel><Input className="rounded-xl h-11 font-black" value={form.watch(`variants.${index}.stock`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.stock`, v))} /></div>
//                                                         <div>
//                                                             <FormLabel className="text-[9px] font-black uppercase">Discount</FormLabel>
//                                                             <Select onValueChange={(v) => form.setValue(`variants.${index}.discount_type`, v as any)} value={form.watch(`variants.${index}.discount_type`)}>
//                                                                 <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
//                                                                 <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="percentage">%</SelectItem><SelectItem value="amount">Fixed</SelectItem></SelectContent>
//                                                             </Select>
//                                                         </div>
//                                                         <div><FormLabel className="text-[9px] font-black uppercase">Value</FormLabel><Input className="rounded-xl h-11" value={form.watch(`variants.${index}.discount_value`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.discount_value`, v))} /></div>
//                                                     </div>
//                                                 </div>
//                                             )
//                                         })}
//                                         <Button type="button" variant="outline" className="w-full border-dashed border-slate-300 h-14 rounded-[1.5rem] font-black text-[10px] uppercase text-slate-400 hover:text-indigo-500 transition-colors" onClick={() => addV({ title: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#000000", variant_image_urls: [] })}>
//                                             <Plus className="w-4 h-4 mr-2" /> Add Shade Option
//                                         </Button>
//                                     </div>
//                                 ) : (
//                                     <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-white/50">
//                                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Default SKU Mode Active</p>
//                                     </div>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     </div>

//                     <div className="space-y-6">
//                         {/* PRICING (Single Mode) */}
//                         {!hasVariants && (
//                             <Card className="rounded-[2rem] border-blue-100 bg-blue-50/20">
//                                 <CardHeader className="bg-blue-50/50 border-b border-blue-100"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-900 flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Pricing & Stock</CardTitle></CardHeader>
//                                 <CardContent className="space-y-4 pt-6">
//                                     <FormField control={form.control} name="base_price" render={({ field }) => (
//                                         <FormItem><FormLabel className="text-[9px] font-black uppercase">Retail Price</FormLabel><FormControl><Input className="h-12 rounded-xl bg-white border-blue-100 font-bold" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormControl></FormItem>
//                                     )} />
//                                     <FormField control={form.control} name="stock" render={({ field }) => (
//                                         <FormItem><FormLabel className="text-[9px] font-black uppercase">Initial Inventory</FormLabel><FormControl><Input className="h-12 rounded-xl bg-white border-blue-100 font-bold" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormControl></FormItem>
//                                     )} />
//                                     <div className="pt-4 border-t border-blue-100 space-y-4">
//                                         <h4 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2"><Tag className="w-3 h-3" /> Sale Configuration</h4>
//                                         <FormField control={form.control} name="discount_type" render={({ field }) => (
//                                             <Select onValueChange={field.onChange} value={field.value}>
//                                                 <SelectTrigger className="h-11 rounded-xl bg-white border-blue-100 font-bold text-[10px]"><SelectValue /></SelectTrigger>
//                                                 <SelectContent><SelectItem value="none">Standard Pricing</SelectItem><SelectItem value="percentage">Percentage Off</SelectItem><SelectItem value="amount">Fixed Amount Off</SelectItem></SelectContent>
//                                             </Select>
//                                         )} />
//                                         <FormField control={form.control} name="discount_value" render={({ field }) => (
//                                             <Input className="h-11 rounded-xl bg-white border-blue-100" placeholder="Reduction Value" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} />
//                                         )} />
//                                     </div>
//                                 </CardContent>
//                             </Card>
//                         )}

//                         {/* REORDERABLE GALLERY */}
//                         <Card className="rounded-[2rem] overflow-hidden border-slate-200 shadow-sm">
//                             <CardHeader className="bg-slate-50 border-b">
//                                 <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest text-slate-400">
//                                     <Upload className="w-4 h-4" /> Media Assets
//                                 </CardTitle>
//                             </CardHeader>
//                             <CardContent className="space-y-4 pt-6">
//                                 <input type="file" ref={fileInputRef} multiple className="hidden" accept="image/*" onChange={handleImageChange} />

//                                 <div
//                                     onClick={() => fileInputRef.current?.click()}
//                                     className="border-2 border-dashed rounded-[1.5rem] border-slate-200 p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all group"
//                                 >
//                                     <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
//                                         <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
//                                     </div>
//                                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter mt-3">Import Media</p>
//                                 </div>

//                                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
//                                     <SortableContext items={previews} strategy={rectSortingStrategy}>
//                                         <div className="grid grid-cols-2 gap-3">
//                                             {previews.map((src, i) => (
//                                                 <SortableImage
//                                                     key={src}
//                                                     url={src}
//                                                     index={i}
//                                                     onRemove={removeImage}
//                                                 />
//                                             ))}
//                                         </div>
//                                     </SortableContext>
//                                 </DndContext>

//                                 <FormDescription className="text-[9px] text-center uppercase font-bold text-slate-400 pt-2 tracking-widest">
//                                     Drag images to reorder (1st = Cover)
//                                 </FormDescription>
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
//             </form>
//         </Form>
//     )
// }
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
    ChevronRight, X, PlusCircle
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
    initialData?: any
    isEdit?: boolean
}

export default function ProductForm({ categories = [], initialData, isEdit = false }: ProductFormProps) {
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
            has_variants: false, category_ids: [], base_price: 0, stock: 0,
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

    const handleNumberChange = (val: string, onChange: (v: number) => void) => {
        const clean = val.replace(/[^0-9.]/g, "")
        onChange(clean === "" ? 0 : parseFloat(clean))
    }

    async function onSubmit(values: ProductFormValues) {
        setIsPending(true)
        try {
            const formData = new FormData()
            const actualVariants = values.has_variants ? values.variants.map((v) => ({
                ...v,
                image_indices: (v.variant_image_urls || []).map(url => previews.indexOf(url)).filter(idx => idx !== -1)
            })) : [];

            const { image_files, ...rest } = values
            const payload = { ...rest, variants: actualVariants, existing_images: previews.filter(p => !p.startsWith('blob:')) }
            formData.append("payload", JSON.stringify(payload))
            values.image_files?.forEach((file: File) => formData.append("files", file))

            const res = isEdit ? await updateProduct(initialData.id, formData) : await createProduct(formData)
            if (res.success) {
                setIsSuccess(true)
                toast.success(isEdit ? "Product updated" : "Product created")
                setTimeout(() => {
                    router.push("/admin/products")
                    router.refresh()
                }, 1000)
            } else toast.error(res.error)
        } catch (e) { toast.error("Submission failed") } finally { setIsPending(false) }
    }

    if (!mounted) return null

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-1">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic text-slate-900">{isEdit ? "Update Item" : "New Collection"}</h1>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">Inventory Management System</p>
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" onClick={() => router.back()} className="rounded-xl font-bold uppercase text-[10px]">Back</Button>
                        <Button
                            type="submit"
                            disabled={isPending || isSuccess}
                            className={`font-black min-w-[180px] h-12 rounded-xl transition-all duration-300 text-[11px] uppercase tracking-wider flex items-center justify-center ${isSuccess ? "bg-emerald-500 hover:bg-emerald-500 shadow-emerald-200 text-white" : "bg-slate-900 shadow-xl shadow-slate-200 text-white"}`}
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                            ) : isSuccess ? (
                                <div className="flex items-center gap-2 animate-in zoom-in-50">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Verified</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>{isEdit ? "Sync Changes" : "Create Product"}</span>
                                    <ChevronRight className="w-3 h-3 opacity-50 text-white" />
                                </div>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* BASIC DETAILS */}
                        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50 border-b">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Info className="w-4 h-4" /> Identification</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Product Title</FormLabel><FormControl><Input className="rounded-xl h-12 bg-slate-50 border-none font-bold text-slate-900" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="brand" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Brand Authority</FormLabel><FormControl><Input className="rounded-xl h-12 bg-slate-50 border-none font-bold text-slate-900" {...field} /></FormControl></FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Product Narration</FormLabel>
                                        <FormControl>
                                            <RichTextEditor value={field.value ?? ""} onChange={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="category_ids" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Department Mapping</FormLabel><MultiSelect options={categories.map(c => ({ label: c.name, value: c.id }))} selected={field.value || []} onChange={field.onChange} /></FormItem>
                                )} />
                            </CardContent>
                        </Card>

                        {/* SHADES/VARIANTS */}
                        <Card className={`rounded-[2rem] transition-all duration-300 ${hasVariants ? "border-indigo-200 bg-indigo-50/5 shadow-inner" : "border-slate-200"}`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2"><Pipette className="w-4 h-4" /> Shade Palette</CardTitle>
                                <FormField control={form.control} name="has_variants" render={({ field }) => (
                                    <div className="flex items-center gap-3 bg-white p-2 rounded-full border shadow-sm px-4">
                                        <span className="text-[9px] font-black uppercase text-slate-500">Enable Variations</span>
                                        <Switch checked={field.value} onCheckedChange={(c) => { field.onChange(c); if (!c) form.setValue("variants", []); else if (vFields.length === 0) addV({ title: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#000000", variant_image_urls: [] }); }} />
                                    </div>
                                )} />
                            </CardHeader>
                            <CardContent className="pt-6">
                                {hasVariants ? (
                                    <div className="space-y-4">
                                        {vFields.map((field, index) => {
                                            const selectedImages = form.watch(`variants.${index}.variant_image_urls`) || [];
                                            const hexCode = form.watch(`variants.${index}.hex_code`) || "#cbd5e1";

                                            return (
                                                <div key={field.id} className="group p-6 border border-slate-100 rounded-[2.5rem] bg-white space-y-6 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 relative">

                                                    {/* DELETE BUTTON - Positioned top-right for space efficiency */}
                                                    <div className="absolute top-6 right-6">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => remV(index)}
                                                            className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl h-10 w-10 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="flex flex-col md:flex-row gap-10">

                                                        {/* 1. VISUAL IDENTITY GROUP */}
                                                        <div className="flex-1 space-y-4">
                                                            <div className="flex items-center gap-2 px-1">
                                                                <div className="h-3 w-1 bg-indigo-500 rounded-full" />
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Visual Identity</h4>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                {/* Swatch & Hex Stack */}
                                                                <div className="flex flex-col items-center gap-2 shrink-0">
                                                                    <div
                                                                        className="w-12 h-12 rounded-2xl border-4 border-white shadow-lg transition-transform duration-500 group-hover:scale-105"
                                                                        style={{ backgroundColor: hexCode.startsWith('#') ? hexCode : `#${hexCode}` }}
                                                                    />
                                                                    <Input
                                                                        className="w-20 h-9 rounded-xl text-[9px] font-mono uppercase bg-slate-50 border-none text-center focus:bg-white transition-all"
                                                                        placeholder="#HEX"
                                                                        {...form.register(`variants.${index}.hex_code`)}
                                                                    />
                                                                </div>

                                                                {/* Shade Name */}
                                                                <div className="flex-1">
                                                                    <FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">Shade Designation</FormLabel>
                                                                    <Input
                                                                        className="rounded-2xl h-12 bg-slate-50 border-none font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                                                                        placeholder="e.g. Midnight Velvet"
                                                                        {...form.register(`variants.${index}.title`)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 2. MEDIA ASSETS GROUP (COMPACT SQUARE) */}
                                                        <div className="space-y-4 shrink-0">
                                                            <div className="flex items-center gap-2 px-1">
                                                                <div className="h-3 w-1 bg-slate-200 rounded-full" />
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Media</h4>
                                                            </div>

                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className={`group relative w-20 h-20 rounded-[1.5rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-1
                      ${selectedImages.length > 0
                                                                                ? 'border-indigo-600 bg-indigo-50/30 text-indigo-600'
                                                                                : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-300'}`}
                                                                    >
                                                                        {selectedImages.length > 0 ? (
                                                                            <>
                                                                                <span className="text-lg font-black italic tracking-tighter leading-none">{selectedImages.length}</span>
                                                                                <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Linked</span>
                                                                            </>
                                                                        ) : (
                                                                            <PlusCircle className="w-5 h-5 opacity-40 group-hover:scale-110 group-hover:opacity-100 transition-all" />
                                                                        )}
                                                                    </button>
                                                                </DialogTrigger>

                                                                <DialogContent className="!fixed !inset-0 !m-0 !p-0 !max-w-none !w-screen !h-screen !translate-x-0 !translate-y-0 !top-0 !left-0 border-none rounded-none flex flex-col bg-white z-[9999] outline-none overflow-hidden">
                                                                    {/* ... Existing Media Library logic (Header, Grid, etc.) ... */}
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                    </div>

                                                    {/* 3. PRICING & INVENTORY (Compact Grid) */}
                                                    <div className="pt-5 border-t border-slate-50">
                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                            <div className="space-y-1.5">
                                                                <FormLabel className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Retail Price</FormLabel>
                                                                <div className="relative">
                                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">₹</span>
                                                                    <Input className="rounded-xl h-10 font-bold text-slate-900 bg-slate-50 border-none pl-8" value={form.watch(`variants.${index}.price`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.price`, v))} />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <FormLabel className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Stock</FormLabel>
                                                                <Input className="rounded-xl h-10 font-black text-slate-900 bg-slate-50 border-none px-4" value={form.watch(`variants.${index}.stock`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.stock`, v))} />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <FormLabel className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Discount</FormLabel>
                                                                <Select onValueChange={(v) => form.setValue(`variants.${index}.discount_type`, v as any)} value={form.watch(`variants.${index}.discount_type`)}>
                                                                    <SelectTrigger className="h-10 rounded-xl text-slate-900 bg-slate-50 border-none font-bold uppercase text-[8px] tracking-widest"><SelectValue /></SelectTrigger>
                                                                    <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="percentage">Percentage %</SelectItem><SelectItem value="amount">Fixed</SelectItem></SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <FormLabel className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Value</FormLabel>
                                                                <Input className="rounded-xl h-10 text-slate-900 bg-slate-50 border-none px-4 font-bold" value={form.watch(`variants.${index}.discount_value`)} onChange={(e) => handleNumberChange(e.target.value, (v) => form.setValue(`variants.${index}.discount_value`, v))} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {/* ADD SHADE BUTTON */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full border-2 border-dashed border-slate-100 h-16 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] text-slate-300 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all"
                                            onClick={() => addV({ title: "", price: 0, stock: 0, discount_type: "none", discount_value: 0, hex_code: "#cbd5e1", variant_image_urls: [] })}
                                        >
                                            <Plus className="w-4 h-4 mr-2" /> Append Shade Variant
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center border-2 border-dashed border-slate-50 rounded-[3rem] bg-slate-50/20">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Standard Inventory Protocol Active</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* PRICING (Single Mode) */}
                        {!hasVariants && (
                            <Card className="rounded-[2rem] border-blue-100 bg-blue-50/20 shadow-sm">
                                <CardHeader className="bg-blue-50/50 border-b border-blue-100"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-900 flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Pricing & Stock</CardTitle></CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <FormField control={form.control} name="base_price" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-900">Retail Price</FormLabel><FormControl><Input className="h-12 rounded-xl bg-white border-blue-100 font-bold text-slate-900" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="stock" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-900">Initial Inventory</FormLabel><FormControl><Input className="h-12 rounded-xl bg-white border-blue-100 font-black text-slate-900" type="text" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} /></FormControl></FormItem>
                                    )} />
                                    <div className="pt-4 border-t border-blue-100 space-y-4">
                                        <h4 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2"><Tag className="w-3 h-3" /> Sale Configuration</h4>
                                        <FormField control={form.control} name="discount_type" render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-11 rounded-xl bg-white border-blue-100 font-bold text-[10px] text-slate-900"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="none">Standard Pricing</SelectItem><SelectItem value="percentage">Percentage Off</SelectItem><SelectItem value="amount">Fixed Amount Off</SelectItem></SelectContent>
                                            </Select>
                                        )} />
                                        <FormField control={form.control} name="discount_value" render={({ field }) => (
                                            <Input className="h-11 rounded-xl bg-white border-blue-100 text-slate-900" placeholder="Reduction Value" value={field.value} onChange={(e) => handleNumberChange(e.target.value, field.onChange)} />
                                        )} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b p-6">
                                <CardTitle className="text-[10px] font-black uppercase text-slate-400">Media Assets</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <input type="file" ref={fileInputRef} multiple className="hidden" accept="image/*" onChange={handleImageChange} />
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-[1.5rem] p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all group">
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
                                <FormDescription className="text-[9px] text-center uppercase font-bold text-slate-400 pt-2 tracking-widest">Drag images to reorder (1st = Cover)</FormDescription>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    )
}