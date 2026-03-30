// import { createClient } from "@/utils/supabase/server";
// import { NotificationSettings } from "@/components/profile/NotificationSettings";
// import { Bell, ShieldCheck, Mail } from "lucide-react";
// import Link from "next/link";

// export default async function NotificationsPage() {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();

//     if (!user) {
//         return <div className="p-10 text-center">Please log in to manage settings.</div>;
//     }

//     return (
//         <div className="max-w-2xl mx-auto py-10 px-4">
//             {/* Breadcrumbs/Back Link */}
//             <Link href="/profile" className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block">
//                 ← Back to Profile
//             </Link>

//             <header className="mb-8">
//                 <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notifications</h1>
//                 <p className="text-slate-500 mt-2">
//                     Control how we reach out to you regarding your orders and account activity.
//                 </p>
//             </header>

//             <div className="space-y-6">
//                 {/* Real-time Push Section */}
//                 <section className="bg-slate-50 rounded-xl p-6 border border-slate-200">
//                     <div className="flex items-center gap-3 mb-4">
//                         <div className="p-2 bg-slate-900 rounded-lg">
//                             <Bell className="w-5 h-5 text-white" />
//                         </div>
//                         <div>
//                             <h2 className="text-lg font-semibold">Browser Push Notifications</h2>
//                             <p className="text-sm text-slate-500">Instant updates on your device.</p>
//                         </div>
//                     </div>

//                     <NotificationSettings />
//                 </section>

//                 {/* Informational Cards */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div className="p-4 border rounded-lg flex gap-3 items-start">
//                         <ShieldCheck className="w-5 h-5 text-green-600 mt-1" />
//                         <div>
//                             <h4 className="text-sm font-medium">Safe & Secure</h4>
//                             <p className="text-xs text-slate-500">We only send updates related to your specific orders.</p>
//                         </div>
//                     </div>
//                     <div className="p-4 border rounded-lg flex gap-3 items-start">
//                         <Mail className="w-5 h-5 text-blue-600 mt-1" />
//                         <div>
//                             <h4 className="text-sm font-medium">Email Sync</h4>
//                             <p className="text-xs text-slate-500">Order receipts are always sent to your registered email.</p>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }


import { createClient } from "@/utils/supabase/server";
import { NotificationSettings } from "@/components/profile/NotificationSettings";
import { Bell, ShieldCheck, Mail, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/store/breadcrumbs";

export default async function NotificationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-10 text-center font-serif italic text-zinc-400">
                Please log in to manage your registry.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-0 selection:bg-pink-100">
            {/* Ambient Brand Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-2%] right-[-2%] w-[250px] h-[250px] bg-[#fc2779]/5 rounded-full blur-[80px]" />
            </div>

            <header className="px-6 pt-5 pb-6 border-b border-zinc-50 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <Link
                        href="/profile"
                        className="p-2 -ml-2 text-zinc-400 hover:text-[#fc2779] transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#fc2779]" />
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-[#fc2779]">
                            Preferences
                        </span>
                    </div>
                </div>

                <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                        Stay
                    </p>
                    <h1 className="text-3xl font-serif italic tracking-tighter text-zinc-900 leading-none">
                        Connected.
                    </h1>
                </div>
            </header>

            <main className="relative z-10 px-6 py-10 max-w-xl mx-auto space-y-10">
                <Breadcrumbs
                    items={[
                        { label: 'Profile', href: '/profile' },
                        { label: 'Notifications', href: '/profile/notifications' }
                    ]}
                />
                {/* Real-time Push Section */}
                <section className="bg-[#fffafa] rounded-[2rem] p-8 border border-pink-100/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                        <Bell className="w-12 h-12 text-[#fc2779]" />
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-[#fc2779] rounded-2xl flex items-center justify-center shadow-lg shadow-pink-200">
                            <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Instant Updates</h2>
                            <p className="text-[9px] text-zinc-400 uppercase tracking-widest mt-1">Direct to your device</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-2">
                        <NotificationSettings />
                    </div>
                </section>

                {/* Info Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="p-6 rounded-[2rem] border border-zinc-100 flex gap-4 items-center group hover:border-pink-100 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Curated & Secure</h4>
                            <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">We only share updates regarding your specific orders.</p>
                        </div>
                    </div>

                    <div className="p-6 rounded-[2rem] border border-zinc-100 flex gap-4 items-center group hover:border-pink-100 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Email Archiving</h4>
                            <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">Receipts and tracking are always archived to your inbox.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-10 text-center">
                    <div className="h-[1px] w-12 bg-zinc-100 mx-auto mb-6" />
                    <p className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.5em]">
                        The Makeup Store Wangkhei
                    </p>
                </div>
            </main>
        </div>
    );
}