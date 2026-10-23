"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { categorySchema, type CategoryFormValues } from "@/lib/validations/category"
import { createCategory } from "@/app/actions/categories"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImagePlus, X } from "lucide-react"
import Image from "next/image"

export function CategoryForm({ categories }: { categories: { id: string, name: string }[] }) {
    const router = useRouter()
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string>("")

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: { name: "", slug: "", image_url: "", parent_id: null },
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

    async function onSubmit(data: CategoryFormValues) {
        const formData = new FormData()

        // Match product logic: stringify data and append file
        formData.append("payload", JSON.stringify(data))
        if (selectedFile) {
            formData.append("file", selectedFile)
        }

        const res = await createCategory(formData)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Category created successfully!")
            router.push("/admin/categories")
            router.refresh()
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-xl">

                {/* Simplified Image Upload for Categories (Single Image) */}
                <div className="space-y-2">
                    <FormLabel>Category Image</FormLabel>
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
                                <FormControl><Input {...field} onChange={onNameChange} /></FormControl>
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
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="parent_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Parent Category</FormLabel>
                            <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} defaultValue={field.value || "none"}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">None (Root)</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />

                <Button
                    type="submit"
                    className="w-full bg-black text-white h-12 rounded-xl"
                    disabled={form.formState.isSubmitting}
                >
                    {form.formState.isSubmitting ? "Uploading..." : "Create Category"}
                </Button>
            </form>
        </Form>
    )
}