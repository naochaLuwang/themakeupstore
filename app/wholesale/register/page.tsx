"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, ShieldCheck, Zap, Globe } from "lucide-react"

export default function WholesaleRegister() {
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const formData = new FormData(e.currentTarget)

        const email = formData.get("email") as string
        const password = formData.get("password") as string
        const fullName = formData.get("fullName") as string
        const phone = formData.get("phone") as string
        const businessName = formData.get("businessName") as string
        const gst = formData.get("gst") as string
        const businessType = formData.get("businessType") as string

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName, phone: phone }
            }
        })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

        if (authData.user) {
            const { error: appError } = await supabase
                .from('wholesale_applications')
                .insert({
                    user_id: authData.user.id,
                    business_name: businessName,
                    gst_number: gst,
                    business_type: businessType,
                    status: 'pending'
                })

            if (appError) {
                setError("Account created, but application failed.")
            } else {
                setSubmitted(true)
            }
        }
        setLoading(false)
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center font-sans">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-8">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Application Received</h1>
                <p className="text-slate-500 max-w-sm text-sm">
                    Our team is reviewing your credentials. Access to the B2B portal will be enabled via email notification.
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex font-sans selection:bg-blue-100">
            {/* Left Panel: High Tech/Modern Sidebar */}
            <div className="hidden lg:flex lg:w-5/12 bg-slate-950 p-16 flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -mr-20 -mt-20" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-white font-bold tracking-tighter text-xl mb-12">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">B</div>
                        PORTAL
                    </div>
                    <h1 className="text-6xl font-bold text-white tracking-tighter leading-[0.9]">
                        Scale your <br />
                        <span className="text-blue-500">Business.</span>
                    </h1>
                    <p className="mt-6 text-slate-400 max-w-sm leading-relaxed">
                        Access our direct supply chain, volume discounts, and priority logistics. Designed for modern retailers.
                    </p>
                </div>

                <div className="relative z-10 space-y-8">
                    <FeatureItem icon={<Zap className="w-4 h-4" />} title="Instant Tier Updates" desc="Automated pricing based on volume." />
                    <FeatureItem icon={<ShieldCheck className="w-4 h-4" />} title="Verified Sourcing" desc="100% authentic product guarantee." />
                </div>
            </div>

            {/* Right Panel: Sleek Form */}
            <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50/50">
                <div className="w-full max-w-xl">
                    <div className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Wholesale Registration</h2>
                        <p className="text-slate-500 text-sm mt-1">Complete your professional profile to begin.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <ModernInput label="Full Name" name="fullName" placeholder="John Doe" required />
                            <ModernInput label="Phone Number" name="phone" placeholder="+91 ..." required />
                            <div className="md:col-span-2">
                                <ModernInput label="Business Email" name="email" type="email" placeholder="name@company.com" required />
                            </div>
                            <ModernInput label="Create Password" name="password" type="password" required />
                            <ModernInput label="Business Name" name="businessName" placeholder="LLC Name" required />
                            <ModernInput label="GST / VAT Number" name="gst" placeholder="Tax ID" required />

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-700 ml-1">Industry Segment</label>
                                <select name="businessType" className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer">
                                    <option value="salon">Professional Salon</option>
                                    <option value="retailer">E-commerce Retailer</option>
                                    <option value="artist">Individual Professional</option>
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full h-12 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all font-semibold text-sm shadow-xl shadow-slate-200">
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Submit Application"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}

function ModernInput({ label, ...props }: any) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 ml-1">{label}</label>
            <input
                {...props}
                className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
        </div>
    )
}

function FeatureItem({ icon, title, desc }: any) {
    return (
        <div className="flex gap-4 items-start text-white group">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div>
                <p className="text-sm font-bold tracking-tight">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
        </div>
    )
}