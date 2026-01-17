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
        <div className="min-h-screen bg-[#fafafa] p-4 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        <Link href="/admin" className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 mb-4 transition-colors">
                            <ArrowLeft className="w-3 h-3 mr-2" /> Back to Dashboard
                        </Link>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Waitlist</h1>
                            <div className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black tracking-widest border border-indigo-100 uppercase">
                                Wholesale Artist Portal
                            </div>
                        </div>
                    </div>

                    <Button onClick={exportCSV} className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-xl h-12 px-6 font-bold text-xs uppercase tracking-widest shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <StatCard label="Total Leads" value={entries.length} icon={<Users className="w-5 h-5" />} color="bg-indigo-500" />
                    <StatCard label="Last 24 Hours" value={entries.filter(e => new Date(e.created_at) > new Date(Date.now() - 86400000)).length} icon={<Calendar className="w-5 h-5" />} color="bg-rose-500" />
                    <StatCard label="Verification Rate" value="100%" icon={<Sparkles className="w-5 h-5" />} color="bg-emerald-500" />
                </div>

                {/* Data Table Area */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
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
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-8">Entry ID</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Joined Date</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400 font-medium">Loading Artist Data...</TableCell></TableRow>
                            ) : filteredEntries.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                    <TableCell className="font-mono text-[10px] text-slate-400 pl-8">#{entry.id.slice(0, 8)}</TableCell>
                                    <TableCell className="font-bold text-slate-700">{entry.email}</TableCell>
                                    <TableCell className="text-slate-500 text-xs">{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                                    <TableCell className="text-right pr-8">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                                            <MoreHorizontal className="w-4 h-4" />
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
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg shadow-indigo-100`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900">{value}</p>
            </div>
        </div>
    )
}