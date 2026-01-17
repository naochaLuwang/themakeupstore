import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Check, X, Building2, FileText, User, Eye, MapPin, Ban, History, Users, Clock } from "lucide-react"
import { revalidatePath } from "next/cache"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
        const id = formData.get("id")
        const status = formData.get("status")
        const supabase = await createClient()
        await supabase.from('wholesale_applications').update({ status }).eq('id', id)
        revalidatePath('/admin/wholesale')
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Wholesale Manager</h1>
                        <p className="text-slate-500">Review, verify, and manage B2B partnerships.</p>
                    </div>
                </header>

                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="bg-white border border-slate-200 p-1 rounded-2xl h-14 mb-8 shadow-sm">
                        <TabsTrigger value="pending" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2 items-center">
                            <Clock className="w-4 h-4" /> Pending <span className="ml-1 opacity-50">{pending.length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2 items-center">
                            <Users className="w-4 h-4" /> Partners <span className="ml-1 opacity-50">{approved.length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2 items-center">
                            <History className="w-4 h-4" /> Archived <span className="ml-1 opacity-50">{rejected.length}</span>
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
        </div>
    )
}

// --- Reusable Components ---

function ApplicationCard({ app, action, showActions, statusLabel }: any) {
    return (
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-6 hover:border-slate-300 transition-all shadow-sm group">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 w-full">
                <InfoBlock icon={<Building2 />} label="Business" title={app.business_name} sub={app.business_type} />
                <InfoBlock icon={<FileText />} label="Tax ID" title={app.gst_number} isMono />
                <InfoBlock icon={<User />} label="Applicant" title={app.profiles?.full_name} sub={app.profiles?.phone} />
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
                {statusLabel && (
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mr-2 ${statusLabel === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {statusLabel}
                    </span>
                )}

                <Dialog>
                    <DialogTrigger asChild>
                        <button className="flex-1 lg:flex-none h-10 px-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <Eye className="w-4 h-4" /> Details
                        </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl">
                        <DialogHeader><DialogTitle>Partner Insight</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
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
                            <button type="submit" className="h-10 px-6 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
                                <Check className="w-4 h-4" /> Approve
                            </button>
                        </form>
                        <form action={action}>
                            <input type="hidden" name="id" value={app.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <button type="submit" className="h-10 px-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
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
        <div className="bg-white border border-dashed border-slate-200 p-20 rounded-3xl text-center">
            <p className="text-slate-400 text-sm font-medium">{msg}</p>
        </div>
    )
}

function InfoBlock({ icon, label, title, sub, isMono }: any) {
    return (
        <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:border-blue-100 group-hover:text-blue-500 transition-all shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                <p className={`text-sm font-bold text-slate-900 truncate ${isMono ? 'font-mono' : ''}`}>{title || 'N/A'}</p>
                {sub && <p className="text-[10px] font-medium text-slate-500 uppercase truncate">{sub}</p>}
            </div>
        </div>
    )
}

function DetailItem({ label, value }: any) {
    return (
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-slate-900">{value || 'N/A'}</p>
        </div>
    )
}