"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { motion } from "framer-motion"

interface BreadcrumbItem {
    label: string
    href: string
}

interface BreadcrumbProps {
    items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbProps) {
    return (
        <nav className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-widest mb-8 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 md:mx-0 md:px-0">
            <Link 
                href="/" 
                className="text-zinc-400 hover:text-[#fc2779] flex items-center gap-1.5 transition-colors shrink-0"
            >
                <Home className="w-3 h-3" />
                Home
            </Link>

            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                
                return (
                    <div key={item.href} className="flex items-center gap-1.5 shrink-0">
                        <ChevronRight className="w-3 h-3 text-zinc-300" />
                        {isLast ? (
                            <span className="text-[#fc2779] truncate max-w-[120px] md:max-w-none">
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                href={item.href}
                                className="text-zinc-400 hover:text-[#fc2779] transition-colors"
                            >
                                {item.label}
                            </Link>
                        )}
                    </div>
                )
            })}
        </nav>
    )
}