"use client"

import Link from "next/link"
import { customerStatus, directoryDateLabel, type CustomerSummary } from "@/lib/admin-directory"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function CustomerTable({ customers }: { customers: CustomerSummary[] }) {
    return (
        <div className="rounded-2xl border bg-white overflow-x-auto shadow-sm min-w-0 max-w-full">
            <table className="w-full text-sm">
                <thead className="bg-slate-50/50">
                    <tr>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 tracking-normal">Customer</th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 tracking-normal">Status</th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 tracking-normal">Orders</th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 tracking-normal">Order Value</th>
                        <th className="py-4 px-6 text-right text-xs font-semibold text-slate-500 tracking-normal">Joined</th>
                        <th className="w-[50px]"></th>
                    </tr>
                </thead>
                <tbody>
                    {customers.length === 0 && <tr><td colSpan={6} className="py-12 px-6 text-center text-sm text-slate-500">No customers match these filters.</td></tr>}
                    {customers.map((customer) => {
                        return (
                            <tr key={customer.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6 tabular-nums">
                                    <Link href={`/admin/customers/${customer.id}`} className="font-medium text-slate-900 hover:underline">{customer.full_name || "Unnamed customer"}</Link>
                                    <div className="text-xs text-slate-500">{customer.email || "No email"}</div>
                                    {customer.phone && <div className="text-xs text-slate-500">{customer.phone}</div>}
                                </td>
                                <td className="py-4 px-6 tabular-nums">
                                    <Badge variant={customer.order_count > 0 ? "default" : "secondary"} className="text-xs font-medium">
                                        {customerStatus(customer.order_count)}
                                    </Badge>
                                </td>
                                <td className="py-4 px-6 font-mono text-sm tabular-nums">{customer.order_count}</td>
                                <td className="py-4 px-6 font-semibold text-emerald-600 tabular-nums">₹{Number(customer.order_value).toLocaleString('en-IN')}</td>
                                <td className="py-4 px-6 text-right text-slate-500 text-sm tabular-nums">
                                    {directoryDateLabel(customer.created_at)}
                                </td>
                                <td className="py-4 px-6 tabular-nums">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-label={`Actions for ${customer.full_name || 'customer'}`} variant="ghost" size="icon" className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-500"><MoreHorizontal className="h-4 w-4 stroke-[1.5]" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl">
                                            <DropdownMenuItem disabled={!customer.email} onClick={() => { if (customer.email) window.location.href = `mailto:${customer.email}` }}>
                                                <Mail className="mr-2 h-4 w-4 stroke-[1.5]" /> Email Customer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem disabled={!customer.phone} onClick={() => { if (customer.phone) window.location.href = `tel:${customer.phone.replace(/[^+\d]/g, '')}` }}>
                                                <Phone className="mr-2 h-4 w-4 stroke-[1.5]" /> Call Customer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild><Link href={`/admin/customers/${customer.id}`}>View Order History</Link></DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
