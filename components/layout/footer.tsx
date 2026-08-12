"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Lock, Instagram, Facebook, MessageCircle, MapPin
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
        <footer className="bg-white border-t border-slate-100 antialiased">
            <div className="max-w-[1600px] mx-auto px-16 pt-16 pb-8">

                {/* DESKTOP (xl+) */}
                <div className="hidden xl:grid grid-cols-5 gap-12 mb-14">
                    {/* Brand */}
                    <div className="col-span-1">
                        <Link href="/" className="inline-flex flex-col">
                            <span className="text-lg font-black tracking-[0.1em] leading-none text-slate-900">
                                THE MAKEUP STORE
                            </span>
                            <span className="text-[7px] font-bold tracking-[0.3em] text-slate-300 uppercase mt-1">
                                WANGKHEI
                            </span>
                        </Link>
                        <p className="text-slate-400 text-[13px] leading-relaxed mt-4">
                            Luxury Makeup, Skin Care from the worlds most coveted brand
                        </p>
                        <div className="flex items-center gap-3 mt-6">
                            <a href="https://www.instagram.com/the_makeup_store.wangkhei/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#fc2779]/5 hover:text-[#fc2779] transition-all">
                                <Instagram className="w-4 h-4" />
                            </a>
                            <a href="https://wa.me/8794833630" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#25D366]/5 hover:text-[#25D366] transition-all">
                                <MessageCircle className="w-4 h-4" />
                            </a>
                            <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#1877F2]/5 hover:text-[#1877F2] transition-all">
                                <Facebook className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Shop */}
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 mb-5">Shop</h4>
                        <ul className="space-y-3">
                            {[
                                { label: "All Products", href: "/shop" },
                                { label: "New Arrivals", href: "/new-arrivals" },
                                { label: "Brands", href: "/brands" },
                                { label: "Best Sellers", href: "/shop" },
                                { label: "Offers", href: "/offers" },
                            ].map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-[13px] text-slate-400 hover:text-[#fc2779] transition-colors">{item.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Categories */}
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 mb-5">Categories</h4>
                        <ul className="space-y-3">
                            {[
                                { label: "Lips", href: "/categories/lips" },
                                { label: "Face", href: "/categories/face" },
                                { label: "Eyes", href: "/categories/eyes" },
                                { label: "Skincare", href: "/categories/skincare" },
                                { label: "Accessories", href: "/categories/accessories" },
                            ].map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-[13px] text-slate-400 hover:text-[#fc2779] transition-colors">{item.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Help */}
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 mb-5">Help</h4>
                        <ul className="space-y-3">
                            {[
                                { label: "Contact Us", href: "/contact" },
                                { label: "Track Order", href: "/contact" },
                                { label: "Rewards", href: "/rewards" },
                                { label: "Return Policy", href: "/legal/return_policy" },
                            ].map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-[13px] text-slate-400 hover:text-[#fc2779] transition-colors">{item.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 mb-5">Legal</h4>
                        <ul className="space-y-3">
                            {[
                                { label: "Terms of Use", href: "/legal/terms_and_conditions" },
                                { label: "Privacy Policy", href: "/legal/privacy_policy" },
                                { label: "Disclaimer", href: "/legal/terms_and_conditions" },
                            ].map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-[13px] text-slate-400 hover:text-[#fc2779] transition-colors">{item.label}</Link>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 mb-2">Visit Us</h4>
                            <p className="text-[12px] text-slate-400 leading-relaxed">
                                Michael Plaza 1st Floor,<br />Wangkhei Angom Leikai, Imphal
                            </p>
                        </div>
                    </div>
                </div>

                {/* MOBILE & TABLET */}
                <div className="xl:hidden text-center space-y-8">
                    <Link href="/" className="inline-flex flex-col">
                        <span className="text-lg font-black tracking-[0.1em] leading-none text-slate-900">
                            THE MAKEUP STORE
                        </span>
                        <span className="text-[7px] font-bold tracking-[0.3em] text-slate-300 uppercase mt-1">
                            WANGKHEI
                        </span>
                    </Link>

                    {/* Social */}
                    <div className="flex items-center justify-center gap-3">
                        <a href="https://www.instagram.com/the_makeup_store.wangkhei/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#fc2779]/5 hover:text-[#fc2779] transition-all">
                            <Instagram className="w-4 h-4" />
                        </a>
                        <a href="https://wa.me/8794833630" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#25D366]/5 hover:text-[#25D366] transition-all">
                            <MessageCircle className="w-4 h-4" />
                        </a>
                        <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#1877F2]/5 hover:text-[#1877F2] transition-all">
                            <Facebook className="w-4 h-4" />
                        </a>
                    </div>

                    {/* Links grid */}
                    <div className="grid grid-cols-2 gap-y-8 gap-x-12 text-left max-w-md mx-auto">
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 mb-4">Shop</h4>
                            <ul className="space-y-2.5">
                                <li><Link href="/shop" className="text-[13px] text-slate-400 hover:text-[#fc2779]">All Products</Link></li>
                                <li><Link href="/new-arrivals" className="text-[13px] text-slate-400 hover:text-[#fc2779]">New Arrivals</Link></li>
                                <li><Link href="/brands" className="text-[13px] text-slate-400 hover:text-[#fc2779]">Brands</Link></li>
                                <li><Link href="/offers" className="text-[13px] text-slate-400 hover:text-[#fc2779]">Offers</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 mb-4">Help</h4>
                            <ul className="space-y-2.5">
                                <li><Link href="/contact" className="text-[13px] text-slate-400 hover:text-[#fc2779]">Contact Us</Link></li>
                                <li><Link href="/rewards" className="text-[13px] text-slate-400 hover:text-[#fc2779]">Rewards</Link></li>
                                <li><Link href="/legal/privacy_policy" className="text-[13px] text-slate-400 hover:text-[#fc2779]">Privacy</Link></li>
                                <li><Link href="/legal/terms_and_conditions" className="text-[13px] text-slate-400 hover:text-[#fc2779]">Terms</Link></li>
                            </ul>
                        </div>
                    </div>

                    <p className="text-[12px] text-slate-400 leading-relaxed">
                        Michael Plaza 1st Floor, Wangkhei Angom Leikai, Imphal
                    </p>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-slate-100 pt-6 mt-6 flex flex-col md:flex-row items-center justify-between gap-3">
                    <p className="text-[10px] text-slate-300 uppercase tracking-[0.15em]">
                        © 2026 THE MAKEUP STORE WANGKHEI
                    </p>
                    <div className="flex items-center gap-4">
                        {isAdmin && (
                            <Link href="/admin" className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-50 border border-slate-100 text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#fc2779]/5 hover:border-[#fc2779]/20 hover:text-[#fc2779] transition-all">
                                <Lock className="w-3 h-3" /> Staff
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    )
}