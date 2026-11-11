"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { categorySchema, type CategoryFormValues } from "@/lib/validations/category"
import { updateCategory } from "@/app/actions/categories"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImagePlus, X, Loader2 } from "lucide-react"
import Image from "next/image"

interface EditCategoryFormProps {
    initialData: any
    categories: { id: string, name: string }[]
}

export function EditCategoryForm({ initialData, categories }: EditCategoryFormProps) {
    const router = useRouter()
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string>(initialData.image_url || "")

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: initialData.name || "",
            slug: initialData.slug || "",
            image_url: initialData.image_url || "",
            parent_id: initialData.parent_id || null
        },
    })

    const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setPreview(URL.createObjectURL(file))
        }
    }

    async function onSubmit(data: CategoryFormValues) {
        const formData = new FormData()
        formData.append("payload", JSON.stringify(data))
        if (selectedFile) formData.append("file", selectedFile)

        const res = await updateCategory(initialData.id, formData)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Category updated!")
            router.push("/admin/categories")
            router.refresh()
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
                <div className="space-y-2">
                    <FormLabel>Category Image</FormLabel>
                    <div className="flex items-center gap-4">
                        {preview ? (
                            <div className="relative w-32 h-32 rounded-xl overflow-hidden border">
                                <Image fill src={preview} alt="Preview" className="object-cover" />
                                <button type="button" onClick={() => { setPreview(""); setSelectedFile(null); form.setValue("image_url", "") }}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-lg p-1"
                                >
                                    <X className="w-4 h-4 stroke-[1.5]" />
                                </button>
                            </div>
                        ) : (
                            <label className="w-32 h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                                <ImagePlus className="w-6 h-6 text-gray-400 stroke-[1.5]" />
                                <input type="file" className="hidden" accept="image/*" onChange={onImageSelect} />
                            </label>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="slug" render={({ field }) => (
                        <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <FormField control={form.control} name="parent_id" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Parent Category</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} defaultValue={field.value || "none"}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="none">None (Root)</SelectItem>
                                {categories.filter(c => c.id !== initialData.id).map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )} />

                <Button type="submit" className="w-full bg-black text-white h-12" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin stroke-[1.5]" /> : "Save Changes"}
                </Button>
            </form>
        </Form>
    )
}