"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { concernSchema, type ConcernFormValues } from "@/lib/validations/concern"
import { createConcern, updateConcern } from "@/app/actions/concerns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ImagePlus, X, Search } from "lucide-react"
import Image from "next/image"

interface Product {
    id: string
    name: string
    thumbnail_url: string | null
    category_id: string | null
    product_categories?: { category_id: string }[]
}

interface Category {
    id: string
    name: string
}

interface ConcernFormProps {
    products: Product[]
    categories: Category[]
    initialData?: {
        id: string
        name: string
        slug: string
        image_url: string | null
        product_concerns: { product_id: string }[]
    }
}

export function ConcernForm({ products, initialData, categories }: ConcernFormProps) {
    const router = useRouter()
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string>(initialData?.image_url || "")
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")

    const initialProductIds = initialData?.product_concerns?.map(pc => pc.product_id) || []

    const form = useForm<ConcernFormValues>({
        resolver: zodResolver(concernSchema),
        defaultValues: {
            name: initialData?.name || "",
            slug: initialData?.slug || "",
            image_url: initialData?.image_url || "",
            product_ids: initialProductIds,
        },
    })

    const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setPreview(URL.createObjectURL(file))
        }
    }

    const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        form.setValue("name", val)
        form.setValue("slug", val.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, ""))
    }

    const toggleProduct = (productId: string) => {
        const current: string[] = form.getValues("product_ids") || []
        if (current.includes(productId)) {
            form.setValue("product_ids", current.filter(id => id !== productId), { shouldDirty: true })
        } else {
            form.setValue("product_ids", [...current, productId], { shouldDirty: true })
        }
    }

    async function onSubmit(data: ConcernFormValues) {
        const formData = new FormData()
        formData.append("payload", JSON.stringify(data))
        if (selectedFile) {
            formData.append("file", selectedFile)
        }

        let res
        if (initialData) {
            res = await updateConcern(initialData.id, formData)
        } else {
            res = await createConcern(formData)
        }

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(initialData ? "Concern updated!" : "Concern created!")
            router.push("/admin/concerns")
            router.refresh()
        }
    }

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
        const productCategoryIds = [
            p.category_id,
            ...(p.product_categories?.map(pc => pc.category_id) || []),
        ].filter(Boolean)
        const matchesCategory = categoryFilter === "all" || productCategoryIds.includes(categoryFilter)
        return matchesSearch && matchesCategory
    })

    const selectedIds: string[] = form.watch("product_ids") || []

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Concern Details Section */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900">Concern Details</h3>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <FormLabel>Concern Image</FormLabel>
                        <div className="flex items-center gap-4">
                            {preview ? (
                                <div className="relative w-32 h-32 rounded-xl overflow-hidden border">
                                    <Image fill src={preview} alt="Preview" className="object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => { setPreview(""); setSelectedFile(null) }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <label className="w-32 h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                                    <ImagePlus className="w-6 h-6 text-gray-400" />
                                    <span className="text-[10px] mt-2 text-gray-500">Upload</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={onImageSelect} />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl><Input {...field} onChange={onNameChange} placeholder="e.g. Acne Prone" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g. acne-prone" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Product Assignment Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Product Assignment</h3>
                            <p className="text-sm text-slate-500">Select products linked to this concern.</p>
                        </div>
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                            {selectedIds.length} selected
                        </span>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search products..."
                            className="pl-9 h-10 text-sm rounded-xl border-slate-200"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button
                            type="button"
                            onClick={() => setCategoryFilter("all")}
                            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                                categoryFilter === "all"
                                    ? "bg-rose-500 text-white border-rose-500"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                            }`}
                        >
                            All
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setCategoryFilter(cat.id)}
                                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                                    categoryFilter === cat.id
                                        ? "bg-rose-500 text-white border-rose-500"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Product Checkbox List */}
                    <div className="border rounded-2xl overflow-hidden max-h-[480px] overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-sm text-slate-400">No products found</p>
                            </div>
                        ) : (
                            filteredProducts.map((product) => {
                                const isChecked = selectedIds.includes(product.id)
                                return (
                                    <label
                                        key={product.id}
                                        className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50/50 transition-colors ${isChecked ? "bg-rose-50/30" : ""}`}
                                    >
                                        <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={() => toggleProduct(product.id)}
                                            className="data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                                        />
                                        {product.thumbnail_url ? (
                                            <Image src={product.thumbnail_url} alt={product.name} width={36} height={36} className="w-9 h-9 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                                                <span className="text-xs font-bold text-slate-400">{product.name[0]}</span>
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-slate-900">{product.name}</span>
                                    </label>
                                )
                            })
                        )}
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full bg-black text-white h-12 rounded-xl text-sm font-semibold"
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting
                        ? "Saving..."
                        : initialData ? "Update Concern" : "Create Concern"
                    }
                </Button>
            </form>
        </Form>
    )
}
