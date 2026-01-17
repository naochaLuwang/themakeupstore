"use client"

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Construction, Mail, Sparkles, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinWaitlistAction } from "@/app/actions/waitlist";
import { toast } from "sonner";

export default function WholesaleComingSoon() {
    const [email, setEmail] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        const res = await joinWaitlistAction(email);
        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            setSubmitted(true);
            toast.success("Welcome to the inner circle.");
        }
    }

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-[#fdfdfd] overflow-hidden p-6">

            {/* BACKGROUND REFRACTION BLOBS */}
            <div className="absolute inset-0 z-0">
                <motion.div
                    animate={{ x: [0, 40, 0], y: [0, 60, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-100/50 blur-[120px]"
                />
                <motion.div
                    animate={{ x: [0, -30, 0], y: [-20, 20, -20] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-rose-100/40 blur-[100px]"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-2xl flex flex-col items-center"
            >
                {/* THE GLASS CARD */}
                <div className="w-full bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[3rem] p-12 md:p-20 shadow-[0_20px_50px_rgba(0,0,0,0.03)]">

                    {/* Header */}
                    <div className="flex flex-col items-center mb-10 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                            <Construction className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-daciana md:text-3xl font-black tracking-tighter uppercase text-slate-900 leading-none">
                            THE MAKEUP STORE
                        </h1>
                        <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">WHOLESALE</p>

                        <div className="flex items-center gap-2 mt-6 text-rose-400 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Currently Curating</span>
                        </div>
                    </div>

                    {/* Body Content */}
                    <div className="space-y-6 max-w-md mx-auto text-center">
                        <p className="text-slate-500 text-sm leading-relaxed font-medium px-4">
                            We are currently building an exclusive professional portal for B2B Retail. This space will feature bulk pricing and professional kits.
                        </p>

                        <div className="h-px w-12 bg-slate-200 mx-auto" />

                        <AnimatePresence mode="wait">
                            {!submitted ? (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-4"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        Notify me when we launch
                                    </p>
                                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="Professional Email"
                                                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/60 border border-white focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium outline-none shadow-inner"
                                                required
                                            />
                                        </div>
                                        <Button
                                            disabled={loading}
                                            className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] transition-all min-w-[140px]"
                                        >
                                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Notify Me"}
                                        </Button>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex flex-col items-center gap-3"
                                >
                                    <CheckCircle2 className="text-emerald-500 h-8 w-8" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">You&apos;re on the list</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Navigation & Brand */}
                <div className="flex flex-col items-center gap-8 mt-12">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Store
                    </Link>

                    <div className="flex items-center justify-center gap-4 text-slate-300">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">The Makeupstore Wangkhei</span>
                        <Sparkles className="w-4 h-4" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}