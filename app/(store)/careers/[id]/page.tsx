import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, MapPin, Clock, IndianRupee, Briefcase } from "lucide-react"
import { ApplyForm } from "./apply-form"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ id: string }>
}

const TYPE_LABELS: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contract: "Contract",
    internship: "Internship",
}

export default async function JobDetailPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: job } = await supabase
        .from("jobs")
        .select("id, title, description, location, employment_type, salary_range")
        .eq("id", id)
        .eq("is_active", true)
        .single()

    if (!job) notFound()

    const { data: { user } } = await supabase.auth.getUser()
    let prefill = { full_name: "", email: "", phone: "" }
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", user.id)
            .single()
        prefill = {
            full_name: profile?.full_name || "",
            email: user.email || "",
            phone: profile?.phone || "",
        }
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-2xl mx-auto px-5 pt-10 pb-20">
                <Link
                    href="/careers"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#FC2779] transition-colors mb-6"
                >
                    <ChevronLeft className="w-4 h-4" /> All openings
                </Link>

                {/* Job header */}
                <div className="pb-6 border-b border-slate-100">
                    <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-[#FCE4EC] flex items-center justify-center shrink-0">
                            <Briefcase className="w-5.5 h-5.5 text-[#FC2779]" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">{job.title}</h1>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FC2779] bg-[#FCE4EC] px-2 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3" /> {TYPE_LABELS[job.employment_type] || job.employment_type}
                                </span>
                                {job.location && (
                                    <span className="inline-flex items-center gap-1 text-[13px] text-gray-500">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {job.location}
                                    </span>
                                )}
                                {job.salary_range && (
                                    <span className="inline-flex items-center gap-1 text-[13px] text-gray-500">
                                        <IndianRupee className="w-3.5 h-3.5 text-gray-400" /> {job.salary_range}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {job.description && job.description.replace(/<[^>]*>/g, "").trim() && (
                    <div className="py-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">About the Role</p>
                        <div
                            className="text-sm text-gray-600 leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mb-2 [&_strong]:font-bold [&_a]:text-pink-700 [&_a]:underline [&_img]:rounded-2xl [&_img]:my-4 [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_p]:mb-3 [&_br]:mb-2"
                            dangerouslySetInnerHTML={{ __html: job.description }}
                        />
                    </div>
                )}

                {/* Application form */}
                <div className="mt-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Apply for this Role</p>
                    <ApplyForm jobId={job.id} prefill={prefill} />
                </div>
            </div>
        </div>
    )
}
