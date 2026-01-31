import { createClient } from "@/utils/supabase/server";
import { NotificationSettings } from "@/components/profile/NotificationSettings";
import { Bell, ShieldCheck, Mail } from "lucide-react";
import Link from "next/link";

export default async function NotificationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div className="p-10 text-center">Please log in to manage settings.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            {/* Breadcrumbs/Back Link */}
            <Link href="/profile" className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block">
                ← Back to Profile
            </Link>

            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notifications</h1>
                <p className="text-slate-500 mt-2">
                    Control how we reach out to you regarding your orders and account activity.
                </p>
            </header>

            <div className="space-y-6">
                {/* Real-time Push Section */}
                <section className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-900 rounded-lg">
                            <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Browser Push Notifications</h2>
                            <p className="text-sm text-slate-500">Instant updates on your device.</p>
                        </div>
                    </div>

                    <NotificationSettings />
                </section>

                {/* Informational Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg flex gap-3 items-start">
                        <ShieldCheck className="w-5 h-5 text-green-600 mt-1" />
                        <div>
                            <h4 className="text-sm font-medium">Safe & Secure</h4>
                            <p className="text-xs text-slate-500">We only send updates related to your specific orders.</p>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg flex gap-3 items-start">
                        <Mail className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                            <h4 className="text-sm font-medium">Email Sync</h4>
                            <p className="text-xs text-slate-500">Order receipts are always sent to your registered email.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}