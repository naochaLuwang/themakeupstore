import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Check, X, Building2, FileText, User, Eye, MapPin, Ban, History, Users, Clock } from "lucide-react"
import { revalidatePath } from "next/cache"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requireAdmin } from "@/lib/admin"

export default async function AdminWholesalePanel() {
    const supabase = await createClient()

    // 1. Auth Guard
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('is_admin, user_type').eq('id', user.id).single()
    if (!profile?.is_admin && profile?.user_type !== 'admin') redirect('/')

    // 2. Fetch All Applications
    const { data: allApps } = await supabase
        .from('wholesale_applications')
        .select(`*, profiles!wholesale_applications_user_id_fkey (full_name, phone, street, pincode)`)
        .order('created_at', { ascending: false })

    // 3. Filter Data
    const pending = allApps?.filter(a => a.status === 'pending') || []
    const approved = allApps?.filter(a => a.status === 'approved') || []
    const rejected = allApps?.filter(a => a.status === 'rejected') || []

    async function updateStatus(formData: FormData) {
        "use server"
        const { supabase } = await requireAdmin()
        const id = formData.get("id")
        const status = formData.get("status")
        await supabase.from('wholesale_applications').update({ status }).eq('id', id)
        revalidatePath('/admin/wholesale')
    }

    return (
        <div className="space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">Wholesale Manager</h1>
                        <p className="text-sm text-slate-500">Review, verify, and manage B2B partnerships.</p>
                    </div>
                </header>

                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="bg-slate-100 p-1 rounded-xl w-full h-auto flex justify-start lg:justify-center overflow-x-auto no-scrollbar gap-1">
                        <TabsTrigger value="pending" className="rounded-lg px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-1.5 items-center">
                            <Clock className="w-4 h-4" /> Pending <span className="text-slate-400">{pending.length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="rounded-lg px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-1.5 items-center">
                            <Users className="w-4 h-4" /> Partners <span className="text-slate-400">{approved.length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="rounded-lg px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-1.5 items-center">
                            <History className="w-4 h-4" /> Archived <span className="text-slate-400">{rejected.length}</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* --- PENDING TAB --- */}
                    <TabsContent value="pending" className="space-y-4">
                        {pending.length === 0 ? <EmptyState msg="No pending requests" /> :
                            pending.map((app) => <ApplicationCard key={app.id} app={app} action={updateStatus} showActions={true} />)
                        }
                    </TabsContent>

                    {/* --- APPROVED TAB --- */}
                    <TabsContent value="approved" className="space-y-4">
                        {approved.length === 0 ? <EmptyState msg="No approved partners yet" /> :
                            approved.map((app) => <ApplicationCard key={app.id} app={app} action={updateStatus} showActions={false} statusLabel="Approved" />)
                        }
                    </TabsContent>

                    {/* --- REJECTED TAB --- */}
                    <TabsContent value="rejected" className="space-y-4">
                        {rejected.length === 0 ? <EmptyState msg="No archived applications" /> :
                            rejected.map((app) => <ApplicationCard key={app.id} app={app} action={updateStatus} showActions={false} statusLabel="Rejected" />)
                        }
                    </TabsContent>
                </Tabs>
        </div>
    )
}

// --- Reusable Components ---

function ApplicationCard({ app, action, showActions, statusLabel }: any) {
    return (
        <div className="rounded-2xl border bg-white p-5 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 hover:border-slate-300 transition-all">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 w-full">
                <InfoBlock icon={<Building2 />} label="Business" title={app.business_name} sub={app.business_type} />
                <InfoBlock icon={<FileText />} label="Tax ID" title={app.gst_number} isMono />
                <InfoBlock icon={<User />} label="Applicant" title={app.profiles?.full_name} sub={app.profiles?.phone} />
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
                {statusLabel && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mr-2 ${statusLabel === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {statusLabel}
                    </span>
                )}

                <Dialog>
                    <DialogTrigger asChild>
                        <button className="flex-1 lg:flex-none h-10 px-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <Eye className="w-4 h-4" /> Details
                        </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader><DialogTitle>Partner Insight</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                                <DetailItem label="Full Name" value={app.profiles?.full_name} />
                                <DetailItem label="Contact" value={app.profiles?.phone} />
                            </div>
                            <div className="flex gap-3 items-start p-2">
                                <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                                <p className="text-sm text-slate-600 leading-relaxed">{app.profiles?.street}, {app.profiles?.pincode}</p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {showActions && (
                    <>
                        <form action={action}>
                            <input type="hidden" name="id" value={app.id} />
                            <input type="hidden" name="status" value="approved" />
                            <button type="submit" className="h-10 px-5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-sm">
                                <Check className="w-4 h-4" /> Approve
                            </button>
                        </form>
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