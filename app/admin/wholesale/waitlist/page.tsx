"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { motion } from "framer-motion"
import {
    Users, Mail, Calendar, Download,
    Search, ArrowLeft, MoreHorizontal, Sparkles
} from "lucide-react"
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function WaitlistDashboard() {
    const [entries, setEntries] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const supabase = createClient()

    React.useEffect(() => {
        fetchWaitlist()
    }, [])

    async function fetchWaitlist() {
        const { data, error } = await supabase
            .from('waitlist')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error) setEntries(data)
        setLoading(false)
    }

    const filteredEntries = entries.filter(entry =>
        entry.email.toLowerCase().includes(search.toLowerCase())
    )

    // Simple CSV Export function
    const exportCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + ["ID", "Email", "Joined At"].join(",") + "\n"
            + entries.map(e => `${e.id},${e.email},${e.created_at}`).join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "wholesale_waitlist.csv")
        document.body.appendChild(link)
        link.click()
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        <Link href="/admin" className="inline-flex items-center text-xs font-semibold tracking-normal text-slate-500 hover:text-slate-900 mb-4 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-2 stroke-[1.5]" /> Back to Dashboard
                        </Link>
                        <div className="flex items-center gap-3">
                            <h1 className="text-slate-900 text-2xl font-black tracking-tight">Waitlist</h1>
                            <div className="px-2 py-1 bg-slate-50 text-slate-700 rounded text-xs font-semibold tracking-normal border border-slate-200">
                                Wholesale Artist Portal
                            </div>
                        </div>
                    </div>

                    <Button onClick={exportCSV} className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-xl h-12 px-6 font-semibold text-xs tracking-normal shadow-sm">
                        <Download className="w-4 h-4 mr-2 stroke-[1.5]" /> Export CSV
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <StatCard label="Total Leads" value={entries.length} icon={<Users className="w-5 h-5 stroke-[1.5]" />} color="bg-indigo-500" />
                    <StatCard label="Last 24 Hours" value={entries.filter(e => new Date(e.created_at) > new Date(Date.now() - 86400000)).length} icon={<Calendar className="w-5 h-5 stroke-[1.5]" />} color="bg-rose-500" />
                    <StatCard label="Verification Rate" value="100%" icon={<Sparkles className="w-5 h-5 stroke-[1.5]" />} color="bg-emerald-500" />
                </div>

                {/* Data Table Area */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto min-w-0 max-w-full">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[1.5]" />
                            <Input
                                placeholder="Search emails..."
                                className="pl-10 h-11 bg-slate-50/50 border-none rounded-xl text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-none">
                                <TableHead className="text-xs font-semibold tracking-normal text-slate-500 pl-8">Entry ID</TableHead>
                                <TableHead className="text-xs font-semibold tracking-normal text-slate-500">Email Address</TableHead>
                                <TableHead className="text-xs font-semibold tracking-normal text-slate-500">Joined Date</TableHead>
                                <TableHead className="text-xs font-semibold tracking-normal text-slate-500 text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-500 font-medium tabular-nums">Loading Artist Data...</TableCell></TableRow>
                            ) : filteredEntries.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                    <TableCell className="font-mono text-xs text-slate-500 pl-8 tabular-nums">#{entry.id.slice(0, 8)}</TableCell>
                                    <TableCell className="font-semibold text-slate-700 tabular-nums">{entry.email}</TableCell>
                                    <TableCell className="text-slate-500 text-xs tabular-nums">{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                                    <TableCell className="text-right pr-8 tabular-nums">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                                            <MoreHorizontal className="w-4 h-4 stroke-[1.5]" />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, icon, color }: { label: string, value: any, icon: any, color: string }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-sm`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-semibold tracking-normal text-slate-500 mb-1">{label}</p>
                <p className="text-2xl font-semibold text-slate-900">{value}</p>
            </div>
        </div>
    )
}