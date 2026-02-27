"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Phone, MapPin, Mail,
    ShieldCheck, Lock, Globe, Volume2
} from "lucide-react"

import { Instagram, Facebook, MessageCircle } from "lucide-react";

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
        <footer className="bg-white border-t border-slate-100 pt-16 pb-12">
            <div className="container mx-auto px-4">

                {/* --- DESKTOP VIEW GRID (Hidden on Mobile) --- */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand Section */}
                    <div className="space-y-6">
                        <Link href="/" className="flex flex-col items-start group">
                            <span className="text-xl md:text-2xl font-black tracking-[0.15em] leading-none text-slate-900">
                                THE MAKEUP STORE
                            </span>
                            <span className="text-[8px] font-bold tracking-[0.3em] text-slate-400 uppercase mt-1">
                                WANGKHEI
                            </span>
                        </Link>
                        <p className="text-slate-500 text-sm max-w-xs italic font-serif">
                            One Stop Destination for All Your Makeup Needs.
                        </p>
                        <div className="flex gap-4">
                            <Link href="https://instagram.com/..." className="p-2 bg-slate-50 rounded-full hover:bg-black hover:text-white transition-all"><Instagram className="w-4 h-4" /></Link>
                            <Link href="https://facebook.com/..." className="p-2 bg-slate-50 rounded-full hover:bg-black hover:text-white transition-all"><Facebook className="w-4 h-4" /></Link>
                        </div>
                    </div>

                    {/* Shop Info */}
                    <div>
                        <h4 className="font-bold uppercase text-xs tracking-widest mb-6 text-slate-400">Shop & Info</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li><Link href="/shop" className="hover:underline underline-offset-4">All Products</Link></li>
                            <li><Link href="/contact" className="hover:underline underline-offset-4">Contact Us</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="space-y-6">
                        <h4 className="font-bold uppercase text-xs tracking-widest mb-6 text-slate-400">Legal</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li><Link href="/legal/terms_and_conditions" className="hover:underline underline-offset-4">Terms & Conditions</Link></li>
                            <li><Link href="/legal/privacy_policy" className="hover:underline underline-offset-4">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Address */}
                    <div className="space-y-6">
                        <h4 className="font-bold uppercase text-xs tracking-widest text-slate-400">Visit Us</h4>
                        <div className="space-y-4 text-sm text-slate-600">
                            <p className="leading-relaxed">Michael Plaza 1st Floor, Wangkhei Angom Leikai, Imphal</p>
                            {/* <p className="font-bold">+91 </p> */}
                        </div>
                    </div>
                </div>

                {/* --- MOBILE VIEW (Minimalist Editorial Style) --- */}
                <div className="md:hidden flex flex-col items-center text-center space-y-10">
                    {/* Centered Brand Name */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-[0.2em] font-daciana text-zinc-900">
                            THE MAKEUP STORE
                        </h2>
                        <p className="text-[9px] tracking-[0.4em] text-zinc-400 uppercase">Wangkhei</p>
                    </div>

                    {/* Iconic Row (Sound, Globe, Mail) */}
                    <div className="flex items-center gap-10 text-zinc-400">
                        {/* WhatsApp - UX Tip: Use a wa.me link for direct chat */}
                        <a
                            href="https://wa.me/919999999999?text=Hello! I have a question about my order."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-green-600 transition-colors"
                        >
                            <MessageCircle className="w-5 h-5 stroke-[1.5]" />
                        </a>

                        {/* Instagram */}
                        <a
                            href="https://instagram.com/yourhandle"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-pink-600 transition-colors"
                        >
                            <Instagram className="w-5 h-5 stroke-[1.5]" />
                        </a>

                        {/* Facebook */}
                        <a
                            href="https://facebook.com/yourpage"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 transition-colors"
                        >
                            <Facebook className="w-5 h-5 stroke-[1.5]" />
                        </a>
                    </div>

                    {/* Horizontal Links */}
                    <div className="md:flex hidden flex-wrap justify-center gap-x-6 gap-y-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        <Link href="/legal/privacy_policy">Privacy Policy</Link>
                        <Link href="/legal/terms_and_conditions">Terms of Use</Link>
                        <Link href="/contact">Contact Us</Link>
                        <Link href="/legal/return_policy">Return Policy</Link>
                    </div>

                    {/* Copyright */}
                    <p className="text-[10px] text-zinc-300 font-medium">
                        © 2026 THE MAKEUP STORE WANGKHEI. All rights reserved.
                    </p>

                    {/* Staff Access on Mobile */}
                    {isAdmin && (
                        <Link
                            href="/admin"
                            className="bg-zinc-900 text-white px-5 py-3 mb-10 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <Lock className="w-3 h-3" /> Staff Dashboard
                        </Link>
                    )}
                </div>

                {/* Bottom Bar (Desktop Only) */}
                <div className="hidden md:flex pt-8 border-t border-slate-100 justify-between items-center">
                    <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">
                        © 2026 THE MAKEUP STORE WANGKHEI. All Rights Reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-slate-300">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">SSL Secure</span>
                        </div>
                        {isAdmin && (
                            <Link href="/admin" className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-black transition-all">
                                Staff Dashboard
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    )
}

