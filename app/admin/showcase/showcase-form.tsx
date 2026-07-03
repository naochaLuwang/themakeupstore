"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { createShowcaseItem, updateShowcaseItem } from "@/app/actions/showcase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2, Upload } from "lucide-react"

const schema = z.object({
    title: z.string().min(1, "Title is required"),
    subtitle: z.string().optional(),
    link_url: z.string().optional(),
    position: z.coerce.number().min(0).default(0),
    is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

export function ShowcaseForm({ item }: { item?: any }) {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string>(item?.image_url || "")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: item ? {
            title: item.title || "",
            subtitle: item.subtitle || "",
            link_url: item.link_url || "",
            position: item.position || 0,
            is_active: item.is_active ?? true,
        } : {
            title: "",
            subtitle: "",
            link_url: "",
            position: 0,
            is_active: true,
        }
    })

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        if (f) {
            setFile(f)
            setPreview(URL.createObjectURL(f))
        }
    }

    async function onSubmit(values: FormValues) {
        const formData = new FormData()
        formData.append("title", values.title)
        formData.append("subtitle", values.subtitle || "")
        formData.append("link_url", values.link_url || "")
        formData.append("position", String(values.position))
        formData.append("is_active", values.is_active ? "on" : "off")

        if (file) {
            formData.append("image", file)
        } else if (item?.image_url) {
            formData.append("image_url", item.image_url)
        }

        const res = item
            ? await updateShowcaseItem(item.id, formData)
            : await createShowcaseItem(formData)

        if (res.success) {
            toast.success(item ? "Updated" : "Created")
            router.push("/admin/showcase")
            router.refresh()
        } else {
            toast.error(res.message)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Image Upload */}
                <div className="space-y-2">
                    <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">Image</FormLabel>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center cursor-pointer hover:bg-slate-50 transition-all"
                    >
                        {preview ? (
                            <img src={preview} alt="Preview" className="max-h-48 rounded-xl object-cover" />
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-slate-300" />
                                <p className="text-xs font-medium text-slate-400 mt-3">Click to upload image</p>
                            </>
                        )}
                    </div>
                </div>

                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">Title</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Steal the Show" className="rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="subtitle" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subtitle</FormLabel>
                        <FormControl><Input {...field} placeholder="Optional subtitle" className="rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="link_url" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">Link URL</FormLabel>
                        <FormControl><Input {...field} placeholder="Optional link" className="rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="position" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">Position</FormLabel>
                        <FormControl><Input type="number" {...field} className="rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="is_active" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider !mt-0">Active</FormLabel>
                    </FormItem>
                )} />

                <Button type="submit" className="rounded-xl bg-slate-900 text-white font-semibold">
                    {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : item ? "Update" : "Create"}
                </Button>
            </form>
        </Form>
    )
}
