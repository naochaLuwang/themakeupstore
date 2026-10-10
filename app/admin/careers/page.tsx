import { createClient } from "@/utils/supabase/server"
import { Plus, Edit3, Users, MapPin, Briefcase } from "lucide-react"
import Link from "next/link"
import { JobToggle, DeleteJobButton } from "./job-controls"

const TYPE_LABELS: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contract: "Contract",
    internship: "Internship",
}

export default async function AdminCareersPage() {
    const supabase = await createClient()

    const { data: jobs } = await supabase
        .from("jobs")
        .select("*, job_applications(count)")
        .order("created_at", { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Careers</h1>
                    <p className="text-sm text-slate-500">Post job opportunities and review applications</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/careers/applications" className="rounded-xl h-11 px-5 border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100 inline-flex items-center gap-2">
                        <Users className="w-4 h-4" /> Applications
                    </Link>
                    <Link href="/admin/careers/new" className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New Job
                    </Link>
                </div>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-4 px-6 text-left">Role</th>
                            <th className="py-4 px-6 text-left">Type</th>
                            <th className="py-4 px-6 text-left">Location</th>
                            <th className="py-4 px-6 text-left">Salary</th>
                            <th className="py-4 px-6 text-left">Applications</th>
                            <th className="py-4 px-6 text-left">Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {!jobs || jobs.length === 0 ? (
                            <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-medium">No job postings yet.</td></tr>
                        ) : (
                            jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-slate-50/30 transition-all">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                <Briefcase className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-900 text-sm truncate">{job.title}</div>
                                                <div className="text-xs text-slate-400 truncate">
                                                    {job.description ? job.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 50) || "—" : "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                            {TYPE_LABELS[job.employment_type] || job.employment_type}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-slate-600 inline-flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location || "—"}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-600">{job.salary_range || "—"}</td>
                                    <td className="py-4 px-6">
                                        <Link href="/admin/careers/applications" className="text-sm font-semibold text-slate-900 hover:text-rose-500 transition-colors">
                                            {job.job_applications?.[0]?.count ?? 0}
                                        </Link>
                                    </td>
                                    <td className="py-4 px-6">
                                        <JobToggle id={job.id} isActive={job.is_active} />
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/careers/edit/${job.id}`} className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400 inline-flex items-center justify-center">
                                                <Edit3 className="w-4 h-4" />
                                            </Link>
                                            <DeleteJobButton id={job.id} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
