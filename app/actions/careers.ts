"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { rateLimit } from "@/lib/rate-limit"

const RESUME_BUCKET = "career-resumes"

const applyLimiter = rateLimit("job-application", { windowMs: 60_000, max: 3 })

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship"]
const RESUME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const MAX_RESUME_SIZE = 5 * 1024 * 1024

function jobFromFormData(formData: FormData) {
    return {
        title: (formData.get("title") as string || "").trim(),
        description: (formData.get("description") as string || "").trim() || null,
        location: (formData.get("location") as string || "").trim() || null,
        employment_type: (formData.get("employment_type") as string) || "full_time",
        salary_range: (formData.get("salary_range") as string || "").trim() || null,
        is_active: formData.get("is_active") === "on",
    }
}

export async function createJob(formData: FormData) {
    const { supabase } = await requireAdmin()

    const payload = jobFromFormData(formData)
    if (!payload.title) return { success: false, error: "Title is required" }
    if (!EMPLOYMENT_TYPES.includes(payload.employment_type)) return { success: false, error: "Invalid employment type" }

    const { error } = await supabase.from("jobs").insert(payload)
    if (error) return { success: false, error: error.message }

    revalidatePath("/admin/careers")
    revalidatePath("/careers")
    return { success: true }
}

export async function updateJob(id: string, formData: FormData) {
    const { supabase } = await requireAdmin()

    const payload = jobFromFormData(formData)
    if (!payload.title) return { success: false, error: "Title is required" }
    if (!EMPLOYMENT_TYPES.includes(payload.employment_type)) return { success: false, error: "Invalid employment type" }

    const { error } = await supabase.from("jobs").update({
        ...payload,
        updated_at: new Date().toISOString(),
    }).eq("id", id)

    if (error) return { success: false, error: error.message }

    revalidatePath("/admin/careers")
    revalidatePath("/careers")
    return { success: true }
}

export async function deleteJob(id: string) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from("jobs").delete().eq("id", id)
    if (error) return { success: false, error: error.message }

    revalidatePath("/admin/careers")
    revalidatePath("/careers")
    return { success: true }
}

export async function toggleJob(id: string, current: boolean) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from("jobs").update({
        is_active: !current,
        updated_at: new Date().toISOString(),
    }).eq("id", id)

    if (error) return { success: false, error: error.message }

    revalidatePath("/admin/careers")
    revalidatePath("/careers")
    return { success: true }
}

export async function submitJobApplication(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const jobId = (formData.get("job_id") as string || "").trim()
    const fullName = (formData.get("full_name") as string || "").trim()
    const email = (formData.get("email") as string || "").trim().toLowerCase()
    const phone = (formData.get("phone") as string || "").trim()
    const coverLetter = (formData.get("cover_letter") as string || "").trim()
    const resume = formData.get("resume") as File | null

    if (!jobId || !fullName || !email) {
        return { success: false, error: "Please fill in your name and email" }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: "Please enter a valid email address" }
    }

    const { success: allowed } = applyLimiter.check(user ? `user:${user.id}` : `email:${email}`)
    if (!allowed) {
        return { success: false, error: "Too many applications. Please try again in a minute." }
    }

    const { data: job } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", jobId)
        .eq("is_active", true)
        .single()
    if (!job) {
        return { success: false, error: "This opportunity is no longer accepting applications." }
    }

    if (!resume || resume.size === 0) {
        return { success: false, error: "Please upload your resume" }
    }
    if (!RESUME_TYPES.includes(resume.type)) {
        return { success: false, error: "Resume must be a PDF or Word document (.pdf, .doc, .docx)" }
    }
    if (resume.size > MAX_RESUME_SIZE) {
        return { success: false, error: "Resume is too large. Max file size is 5MB." }
    }

    const safeName = resume.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80) || "resume"
    const buffer = Buffer.from(await resume.arrayBuffer())
    const objectPath = `${jobId}/${Date.now()}-${safeName}`
    try {
        const adminSupabase = await createAdminClient()
        const { error: uploadError } = await adminSupabase.storage
            .from(RESUME_BUCKET)
            .upload(objectPath, buffer, { contentType: resume.type, upsert: false })
        if (uploadError) throw uploadError
    } catch (error) {
        console.error("Resume upload failed:", error)
        return { success: false, error: "Resume upload failed. Please try again." }
    }

    const { error } = await supabase.from("job_applications").insert({
        job_id: jobId,
        user_id: user?.id ?? null,
        full_name: fullName,
        email,
        phone: phone || null,
        cover_letter: coverLetter || null,
        resume_url: objectPath,
        status: "pending",
    })

    if (error) {
        console.error("Job application error:", error)
        return { success: false, error: "Failed to submit application. Please try again." }
    }

    revalidatePath("/admin/careers/applications")
    return { success: true }
}
