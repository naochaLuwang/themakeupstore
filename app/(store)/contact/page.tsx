"use client"

import { Phone, Mail, MapPin, Clock, MessageCircle, ChevronRight } from "lucide-react"
import Link from "next/link"

const CONTACT = {
    address: "Michael Plaza 1st Floor, Wangkhei Angom Leikai, Imphal",
    phone: "+91-6009098096",
    email: "themakeupstorewangkhei@gmail.com",
    hours: "Mon – Sat, 10:00 AM – 8:00 PM",
}

const contactItems = [
    {
        icon: Phone,
        label: "Phone",
        value: CONTACT.phone,
        href: `tel:${CONTACT.phone}`,
    },
    {
        icon: Mail,
        label: "Email",
        value: CONTACT.email,
        href: `mailto:${CONTACT.email}`,
    },
    {
        icon: MapPin,
        label: "Visit Us",
        value: CONTACT.address,
        href: null,
    },
    {
        icon: Clock,
        label: "Store Hours",
        value: CONTACT.hours,
        href: null,
    },
]

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-lg mx-auto px-5 pt-6 pb-20">
                {/* Hero */}
                <div className="flex flex-col items-center pt-4 pb-8">
                    <div className="w-14 h-14 rounded-full bg-[#FCE4EC] flex items-center justify-center mb-4">
                        <MessageCircle className="w-7 h-7 text-[#FC2779]" />
                    </div>
                    <h1 className="text-[26px] font-extrabold tracking-tight text-gray-900 mb-2">
                        Get in Touch
                    </h1>
                    <p className="text-sm text-gray-400 text-center leading-relaxed">
                        We&apos;d love to hear from you. Reach out anytime.
                    </p>
                </div>

                {/* Contact Cards */}
                <div className="space-y-3">
                    {contactItems.map((item, i) => {
                        const Icon = item.icon
                        const content = (
                            <div className="flex items-center gap-3.5 p-4 border border-gray-100 rounded-2xl bg-white">
                                <div className="w-11 h-11 rounded-full bg-[#FCE4EC] flex items-center justify-center shrink-0">
                                    <Icon className="w-5 h-5 text-[#FC2779]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                        {item.label}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900 leading-tight mt-0.5">
                                        {item.value}
                                    </p>
                                </div>
                                {item.href && (
                                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                                )}
                            </div>
                        )
                        if (item.href) {
                            return (
                                <a key={i} href={item.href} className="block">
                                    {content}
                                </a>
                            )
                        }
                        return <div key={i}>{content}</div>
                    })}
                </div>
            </div>
        </div>
    )
}
