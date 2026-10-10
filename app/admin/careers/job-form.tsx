"use client"
import { useState } from "react"
import { createJob, updateJob } from "@/app/actions/careers"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface JobFormProps {
    initialData?: any
}

const EMPLOYMENT_TYPES = [
    { value: "full_time", label: "Full Time" },
    { value: "part_time", label: "Part Time" },
    { value: "contract", label: "Contract" },
    { value: "internship", label: "Internship" },
]

export function JobForm({ initialData }: JobFormProps) {
    const router = useRouter()
    const isEdit = !!initialData
    const [loading, setLoading] = useState(false)
    const [description, setDescription] = useState(initialData?.description || "")

    return (
        <form
            className="space-y-6"
            action={async (formData) => {
                setLoading(true)
                try {
                    const res = isEdit
                        ? await updateJob(initialData.id, formData)
                        : await createJob(formData)
                    if (res.success) {
                        toast.success(isEdit ? "Job updated" : "Job posted")
                        router.push("/admin/careers")
                        router.refresh()
                    } else {
                        toast.error(res.error || "Failed to save")
                    }
                } catch {
                    toast.error("System error")
                } finally {
                    setLoading(false)
                }
            }}
        >
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title *</label>
                <input
                    name="title"
                    required
                    defaultValue={initialData?.title}
                    placeholder="Sales Associate"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10 transition-all outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employment Type</label>
                    <select
                        name="employment_type"
                        defaultValue={initialData?.employment_type || "full_time"}
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10 transition-all outline-none"
                    >
                        {EMPLOYMENT_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                    <input
                        name="location"
                        defaultValue={initialData?.location}
                        placeholder="Imphal, Manipur"
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10 transition-all outline-none"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salary Range</label>
                <input
                    name="salary_range"
                    defaultValue={initialData?.salary_range}
                    placeholder="₹15,000 – ₹25,000 / month"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10 transition-all outline-none"
                />
                <p className="text-xs text-slate-400">Optional. Leave blank to hide salary on the listing.</p>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <RichTextEditor value={description} onChange={setDescription} />
                <input type="hidden" name="description" value={description} />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase text-slate-900 tracking-wider">Publish</p>
                    <p className="text-xs text-slate-400 font-medium">Show this opening on the careers page.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={initialData?.is_active !== false}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="h-11 px-6 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all inline-flex items-center gap-2 disabled:opacity-60"
                >
                    {loading ? "Saving..." : isEdit ? "Update Job" : "Post Job"}
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                </button>
            </div>
        </form>
    )
}
