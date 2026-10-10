import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Check, Ban, Eye, Mail, Clock, Award, Users, History, ExternalLink, FileText, Briefcase } from "lucide-react"
import { revalidatePath } from "next/cache"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requireAdmin } from "@/lib/admin"
import { createAdminClient } from "@/utils/supabase/admin"

const RESUME_BUCKET = "career-resumes"

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    shortlisted: "bg-blue-50 text-blue-700",
    hired: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
}

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    shortlisted: "Shortlisted",
    hired: "Hired",
    rejected: "Rejected",
}

const TYPE_LABELS: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contract: "Contract",
    internship: "Internship",
}

export default async function AdminJobApplicationsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('is_admin, user_type').eq('id', user.id).single()
    if (!profile?.is_admin && profile?.user_type !== 'admin') redirect('/')

    const { data: allApps } = await supabase
        .from('job_applications')
        .select('*, jobs (title, location, employment_type)')
        .order('created_at', { ascending: false })

    const adminClient = await createAdminClient()
    const apps = await Promise.all((allApps || []).map(async (app) => {
        if (!app.resume_url || app.resume_url.startsWith('http')) return app
        const { data } = await adminClient.storage.from(RESUME_BUCKET).createSignedUrl(app.resume_url, 3600)
        return { ...app, resume_url: data?.signedUrl ?? null }
    }))

    const pending = apps.filter(a => a.status === 'pending')
    const shortlisted = apps.filter(a => a.status === 'shortlisted')
    const hired = apps.filter(a => a.status === 'hired')
    const rejected = apps.filter(a => a.status === 'rejected')

    async function updateStatus(formData: FormData) {
        "use server"
        const { supabase } = await requireAdmin()
        const id = formData.get("id")
        const status = formData.get("status")
        await supabase.from('job_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
        revalidatePath('/admin/careers/applications')
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Job Applications</h1>
                    <p className="text-sm text-slate-500">Review applicants, resumes, and hiring status.</p>
                </div>
            </header>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl w-full h-auto flex justify-start overflow-x-auto no-scrollbar gap-1">
                    <TabsTrigger value="pending" className="rounded-lg px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-1.5 items-center">
                        <Clock className="w-4 h-4" /> Pending <span className="text-slate-400">{pending.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="shortlisted" className="rounded-lg px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-1.5 items-center">
                        <Users className="w-4 h-4" /> Shortlisted <span className="text-slate-400">{shortlisted.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="hired" className="rounded-lg px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-1.5 items-center">
                        <Award className="w-4 h-4" /> Hired <span className="text-slate-400">{hired.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="rounded-lg px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-1.5 items-center">
                        <History className="w-4 h-4" /> Rejected <span className="text-slate-400">{rejected.length}</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4">
                    {pending.length === 0 ? <EmptyState msg="No pending applications" /> :
                        pending.map((app) => <ApplicationCard key={app.id} app={app} action={updateStatus} showActions={true} />)
                    }
                </TabsContent>

                <TabsContent value="shortlisted" className="space-y-4">
                    {shortlisted.length === 0 ? <EmptyState msg="No shortlisted applicants yet" /> :
                        shortlisted.map((app) => <ApplicationCard key={app.id} app={app} action={updateStatus} showActions={true} showHire={true} />)
                    }
                </TabsContent>

                <TabsContent value="hired" className="space-y-4">
                    {hired.length === 0 ? <EmptyState msg="No hires yet" /> :
                        hired.map((app) => <ApplicationCard key={app.id} app={app} action={updateStatus} showActions={false} />)
                    }
                </TabsContent>

                <TabsContent value="rejected" className="space-y-4">
                    {rejected.length === 0 ? <EmptyState msg="No rejected applications" /> :
                        rejected.map((app) => <ApplicationCard key={app.id} app={app} action={updateStatus} showActions={false} />)
                    }
                </TabsContent>
            </Tabs>
        </div>
    )
}

function ApplicationCard({ app, action, showActions, showHire }: any) {
    const status = app.status
    return (
        <div className="rounded-2xl border bg-white p-5 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 hover:border-slate-300 transition-all">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 w-full">
                <InfoBlock icon={<Briefcase />} label="Applied For" title={app.jobs?.title || "Deleted role"} sub={app.jobs ? `${TYPE_LABELS[app.jobs.employment_type] || app.jobs.employment_type}${app.jobs.location ? " · " + app.jobs.location : ""}` : null} />
                <InfoBlock icon={<Users />} label="Applicant" title={app.full_name} sub={app.phone} />
                <InfoBlock icon={<Mail />} label="Email" title={app.email} isMono />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[status] || status}
                </span>

                {app.resume_url ? (
                    <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="h-10 px-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <FileText className="w-4 h-4" /> Resume <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                ) : (
                    <span className="h-10 px-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 rounded-xl">
                        <FileText className="w-4 h-4" /> Resume unavailable
                    </span>
                )}

                <Dialog>
                    <DialogTrigger asChild>
                        <button className="h-10 px-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <Eye className="w-4 h-4" /> Details
                        </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader><DialogTitle>Applicant Details</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                                <DetailItem label="Full Name" value={app.full_name} />
                                <DetailItem label="Phone" value={app.phone} />
                                <DetailItem label="Email" value={app.email} />
                                <DetailItem label="Role" value={app.jobs?.title} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cover Note</p>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{app.cover_letter || "No cover note provided."}</p>
                            </div>
                            {app.resume_url && (
                                <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-10 px-4 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors">
                                    <FileText className="w-4 h-4" /> Open Resume <ExternalLink className="w-3 h-3 opacity-60" />
                                </a>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {showActions && (
                    <>
                        {status === 'pending' && (
                            <form action={action}>
                                <input type="hidden" name="id" value={app.id} />
                                <input type="hidden" name="status" value="shortlisted" />
                                <button type="submit" className="h-10 px-5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm">
                                    <Check className="w-4 h-4" /> Shortlist
                                </button>
                            </form>
                        )}
                        {showHire && (
                            <form action={action}>
                                <input type="hidden" name="id" value={app.id} />
                                <input type="hidden" name="status" value="hired" />
                                <button type="submit" className="h-10 px-5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-sm">
                                    <Check className="w-4 h-4" /> Hire
                                </button>
                            </form>
                        )}
                        <form action={action}>
                            <input type="hidden" name="id" value={app.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <button type="submit" className="rounded-lg h-10 w-10 border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all text-slate-400 flex items-center justify-center">
                                <Ban className="w-4 h-4" />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-sm font-medium">{msg}</p>
        </div>
    )
}

function InfoBlock({ icon, label, title, sub, isMono }: any) {
    return (
        <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className={`text-sm font-semibold text-slate-900 truncate ${isMono ? 'font-mono' : ''}`}>{title || 'N/A'}</p>
                {sub && <p className="text-xs font-medium text-slate-500 truncate">{sub}</p>}
            </div>
        </div>
    )
}

function DetailItem({ label, value }: any) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-slate-900">{value || 'N/A'}</p>
        </div>
    )
}
