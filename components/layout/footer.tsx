"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Phone, MapPin, Mail, Instagram,
    Facebook, ShieldCheck, Lock
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
    }, [])

    return (
        <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
            <div className="container mx-auto px-4">
                {/* Main Grid: 
                    Changed from lg:grid-cols-4 to lg:grid-cols-3 or similar is not needed 
                    because the hidden classes will handle the layout shift.
                */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                    {/* Brand Section - Always Visible */}
                    <div className="space-y-6">
                        <Link href="/" className="flex flex-col items-start justify-center group min-w-fit">
                            <span className="text-xl md:text-2xl font-black font-daciana tracking-[0.15em] leading-none text-slate-900 group-hover:text-primary transition-colors">
                                THE MAKEUP STORE
                            </span>
                            <span className="text-[7px] md:text-[8px] font-bold tracking-[0.3em] text-slate-400 uppercase whitespace-nowrap mt-1">
                                WANGKHEI
                            </span>
                        </Link>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                            One Stop Destination for All Your Makeup Needs.
                        </p>
                        <div className="flex gap-4">
                            <Link href="https://www.instagram.com/the_makeup_store.wangkhei" className="p-2 bg-slate-50 rounded-full hover:bg-black hover:text-white transition-all"><Instagram className="w-4 h-4" /></Link>
                            <Link href="https://www.facebook.com/themakeupstore.wangkhei" className="p-2 bg-slate-50 rounded-full hover:bg-black hover:text-white transition-all"><Facebook className="w-4 h-4" /></Link>
                        </div>
                    </div>

                    {/* Quick Links - HIDDEN ON MOBILE */}
                    <div className="hidden md:block">
                        <h4 className="font-bold uppercase text-xs tracking-widest mb-6 text-slate-400">Shop & Info</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li><Link href="/shop" className="hover:translate-x-1 transition-transform inline-block">All Products</Link></li>
                            <li><Link href="/contact" className="hover:translate-x-1 transition-transform inline-block">Contact Us</Link></li>
                        </ul>
                    </div>

                    {/* Legal Links - Always Visible (Recommended for compliance) */}
                    <div className="hidden md:block space-y-6">
                        <h4 className="font-bold uppercase text-xs tracking-widest mb-6 text-slate-400">Legal</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li><Link href="/legal/terms_and_conditions" className="hover:translate-x-1 transition-transform inline-block">Terms & Conditions</Link></li>
                            <li><Link href="/legal/return_policy" className="hover:translate-x-1 transition-transform inline-block">Return Policy</Link></li>
                            <li><Link href="/legal/privacy_policy" className="hover:translate-x-1 transition-transform inline-block">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Contact & Address - HIDDEN ON MOBILE */}
                    <div className="hidden md:block space-y-6">
                        <h4 className="font-bold uppercase text-xs tracking-widest text-slate-400">Visit Us</h4>
                        <div className="space-y-4 text-sm">
                            <div className="flex gap-3">
                                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                                <span className="text-slate-600 leading-tight">
                                    Michael Plaza 1st Floor.Wangkhei Angom Leikai Opposite Thangal Temple , 795005, Imphal East , Manipur
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                                <span className="text-slate-600 font-bold">+91 6909013764</span>
                            </div>
                            <div className="flex gap-3">
                                <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                                <span className="text-slate-600">themakeupstorewangkhei@gmail.com</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="hidden md:flex pt-8 border-t border-slate-100 flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-tight text-center md:text-left">
                        © 2026 THE MAKEUP STORE WANGKHEI. All Rights Reserved.
                    </p>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-slate-300">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">SSL Secure</span>
                        </div>

                        {isAdmin && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-black transition-all"
                                title="Admin Dashboard"
                            >
                                <Lock className="w-3 h-3" />
                                Staff Dashboard
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    )
}