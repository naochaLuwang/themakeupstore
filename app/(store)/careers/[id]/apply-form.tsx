"use client"

import { useState } from "react"
import { submitJobApplication } from "@/app/actions/careers"
import { Loader2, Upload, FileText, CheckCircle2, X } from "lucide-react"
import { toast } from "sonner"

interface ApplyFormProps {
    jobId: string
    prefill?: { full_name: string; email: string; phone: string }
}

const MAX_SIZE = 5 * 1024 * 1024

export function ApplyForm({ jobId, prefill }: ApplyFormProps) {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [fileName, setFileName] = useState("")
    const [fileSize, setFileSize] = useState(0)

    if (done) {
        return (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-[15px] font-semibold text-gray-900">Application Received</p>
                <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
                    Thank you for applying! Our team will review your resume and get in touch
                    with you if there&apos;s a match.
                </p>
            </div>
        )
    }

    return (
        <form
            className="space-y-4"
            action={async (formData) => {
                const resume = formData.get("resume") as File | null
                if (resume && resume.size > 0 && resume.size > MAX_SIZE) {
                    toast.error("Resume is too large. Max file size is 5MB.")
                    return
                }
                setLoading(true)
                try {
                    const res = await submitJobApplication(formData)
                    if (res.success) {
                        toast.success("Application submitted")
                        setDone(true)
                    } else {
                        toast.error(res.error || "Failed to submit application")
                    }
                } catch {
                    toast.error("System error. Please try again.")
                } finally {
                    setLoading(false)
                }
            }}
        >
            <input type="hidden" name="job_id" value={jobId} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                    <input
                        name="full_name"
                        required
                        defaultValue={prefill?.full_name}
                        placeholder="Your full name"
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#FC2779] focus:ring-2 focus:ring-[#FC2779]/10 transition-all outline-none"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                    <input
                        name="phone"
                        type="tel"
                        defaultValue={prefill?.phone}
                        placeholder="Your phone number"
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#FC2779] focus:ring-2 focus:ring-[#FC2779]/10 transition-all outline-none"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email *</label>
                <input
                    name="email"
                    type="email"
                    required
                    defaultValue={prefill?.email}
                    placeholder="you@example.com"
                    className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#FC2779] focus:ring-2 focus:ring-[#FC2779]/10 transition-all outline-none"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cover Note</label>
                <textarea
                    name="cover_letter"
                    rows={4}
                    placeholder="Tell us why you're a great fit for this role (optional)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#FC2779] focus:ring-2 focus:ring-[#FC2779]/10 transition-all resize-none outline-none"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resume *</label>
                <label className="flex items-center gap-3 w-full h-11 bg-white border border-dashed border-slate-300 rounded-xl px-4 cursor-pointer hover:border-[#FC2779] hover:bg-[#FC2779]/[0.03] transition-all">
                    <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-500 truncate">
                        {fileName ? fileName : "Choose your resume (PDF, DOC, DOCX — max 5MB)"}
                    </span>
                    <input
                        type="file"
                        name="resume"
                        required
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (!f) { setFileName(""); setFileSize(0); return }
                            if (f.size > MAX_SIZE) {
                                toast.error("Resume is too large. Max file size is 5MB.")
                                e.target.value = ""
                                setFileName("")
                                setFileSize(0)
                                return
                            }
                            setFileName(f.name)
                            setFileSize(f.size)
                        }}
                    />
                    {fileName && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setFileName("")
                                setFileSize(0)
                                const input = e.currentTarget.parentElement?.querySelector("input[type=file]") as HTMLInputElement | null
                                if (input) input.value = ""
                            }}
                            className="ml-auto shrink-0 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </label>
                {fileName && fileSize > 0 && (
                    <p className="text-xs text-slate-400 inline-flex items-center gap-1 ml-1">
                        <FileText className="w-3 h-3" /> {fileName} · {(fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto h-11 px-8 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-[#FC2779] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
                {loading ? "Submitting..." : "Submit Application"}
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            </button>
        </form>
    )
}
