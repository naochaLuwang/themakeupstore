"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    ShieldCheck, Lock, Instagram, Facebook, MessageCircle
} from "lucide-react"

export function Footer() {
    const supabase = createClient()
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        async function checkAdmin() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single()
                setIsAdmin(data?.is_admin || false)
            }
        }
        checkAdmin()
    }, [supabase])

    return (
        <footer className="bg-white border-t border-slate-100 pt-16 pb-12 antialiased">
            <div className="container mx-auto px-6">

                {/* --- DESKTOP VIEW GRID --- 
                    Only visible on Large Screens ( > 1280px )
                */}
                <div className="hidden xl:grid grid-cols-4 gap-12 mb-16">
                    <div className="space-y-6">
                        <Link href="/" className="flex flex-col items-start group">
                            <span className="text-2xl font-black tracking-[0.15em] leading-none text-slate-900">
                                THE MAKEUP STORE
                            </span>
                            <span className="text-[8px] font-bold tracking-[0.3em] text-slate-400 uppercase mt-1">
                                WANGKHEI
                            </span>
                        </Link>
                        <p className="text-slate-500 text-sm max-w-xs italic font-serif leading-relaxed">
                            One Stop Destination for All Your Makeup Needs.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-6 text-slate-300">Shop & Info</h4>
                        <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-slate-600">
                            <li><Link href="/shop" className="hover:text-[#fc2779] transition-colors">All Products</Link></li>
                            <li><Link href="/rewards" className="hover:text-[#fc2779] transition-colors">Rewards</Link></li>
                            <li><Link href="/contact" className="hover:text-[#fc2779] transition-colors">Contact Us</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-6 text-slate-300">Legal</h4>
                        <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-slate-600">
                            <li><Link href="/legal/terms_and_conditions" className="hover:text-[#fc2779] transition-colors">Terms of Use</Link></li>
                            <li><Link href="/legal/privacy_policy" className="hover:text-[#fc2779] transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-6 text-slate-300">Visit Us</h4>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 leading-loose">
                            Michael Plaza 1st Floor,<br />Wangkhei Angom Leikai, Imphal
                        </p>
                    </div>
                </div>

                {/* --- MOBILE & TABLET VIEW (Up to 1280px) --- 
                    Optimized for 7" and High-Resolution 10" Tablets
                */}
                <div className="xl:hidden flex flex-col items-center text-center space-y-12 py-4">
                    {/* Brand Branding */}
                    <div className="space-y-3">
                        <h2 className="text-xl md:text-3xl font-daciana font-black tracking-[0.3em] text-zinc-900 uppercase">
                            THE MAKEUP STORE
                        </h2>
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] w-8 md:w-12 bg-zinc-200" />
                            <p className="text-[10px] md:text-[11px] tracking-[0.5em] text-zinc-400 uppercase font-bold">Wangkhei</p>
                            <div className="h-[1px] w-8 md:w-12 bg-zinc-200" />
                        </div>
                    </div>

                    {/* Social Row - Larger touch targets for tablet users */}
                    <div className="flex items-center gap-12 md:gap-16">
                        <a href="https://wa.me/8794833630" className="p-4 bg-zinc-50 rounded-full text-zinc-400 hover:text-[#25D366] transition-all active:scale-90">
                            <MessageCircle className="w-6 h-6 stroke-[1.5]" />
                        </a>
                        <a href="https://www.instagram.com/the_makeup_store.wangkhei/" className="p-4 bg-zinc-50 rounded-full text-zinc-400 hover:text-[#fc2779] transition-all active:scale-90">
                            <Instagram className="w-6 h-6 stroke-[1.5]" />
                        </a>
                        <a href="https://facebook.com/..." className="p-4 bg-zinc-50 rounded-full text-zinc-400 hover:text-[#1877F2] transition-all active:scale-90">
                            <Facebook className="w-6 h-6 stroke-[1.5]" />
                        </a>
                    </div>

                    {/* Tablet Friendly Link Grid - Wider spacing for large tablets */}
                    <div className=" hidden md:flex flex-wrap justify-center gap-x-10 gap-y-6 px-4 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                        <Link href="/shop" className="hover:text-zinc-900">Shop All</Link>
                        <Link href="/rewards" className="hover:text-zinc-900">Rewards</Link>
                        <Link href="/legal/privacy_policy" className="hover:text-zinc-900">Privacy</Link>
                        <Link href="/legal/terms_and_conditions" className="hover:text-zinc-900">Terms</Link>
                        <Link href="/contact" className="hover:text-zinc-900">Contact Us</Link>
                        <Link href="/legal/return_policy" className="hover:text-zinc-900">Returns</Link>
                    </div>

                    {/* Footer Info */}
                    <div className="space-y-6">
                        <p className="text-[9px] md:text-[10px] text-zinc-300 font-bold uppercase tracking-[0.3em]">
                            © 2026 THE MAKEUP STORE WANGKHEI
                        </p>
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                            >
                                <Lock className="w-3.5 h-3.5" /> Staff Dashboard
                            </Link>
                        )}
                    </div>
                </div>

                {/* Bottom Secure Bar (Desktop Only) */}
                <div className="hidden xl:flex pt-10 border-t border-slate-50 justify-between items-center">
                    <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.4em]">
                        Authenticated Boutique Experience
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-slate-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span className="text-[9px] uppercase font-black tracking-widest">SSL Secured Maison</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}