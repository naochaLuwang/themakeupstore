"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function CustomerTable({ customers }: { customers: any[] }) {
    return (
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
                <thead className="bg-slate-50/50">
                    <tr>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Orders</th>
                        <th className="py-4 px-6 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spend</th>
                        <th className="py-4 px-6 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                        <th className="w-[50px]"></th>
                    </tr>
                </thead>
                <tbody>
                    {customers.map((customer) => {
                        const totalSpend = customer.orders.reduce((acc: number, o: any) => acc + Number(o.total), 0)
                        return (
                            <tr key={customer.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="font-medium text-slate-900">{customer.full_name || "Anonymous"}</div>
                                    <div className="text-xs text-slate-400">{customer.email}</div>
                                </td>
                                <td className="py-4 px-6">
                                    <Badge variant={customer.orders.length > 0 ? "default" : "secondary"} className="text-[10px] font-medium">
                                        {customer.orders.length > 0 ? "RECURRING" : "LEAD"}
                                    </Badge>
                                </td>
                                <td className="py-4 px-6 font-mono text-sm">{customer.orders.length}</td>
                                <td className="py-4 px-6 font-semibold text-emerald-600">₹{totalSpend.toLocaleString()}</td>
                                <td className="py-4 px-6 text-right text-slate-400 text-sm">
                                    {format(new Date(customer.created_at), "MMM dd, yyyy")}
                                </td>
                                <td className="py-4 px-6">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 border border-slate-200 hover:bg-slate-100 transition-all text-slate-400"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl">
                                            <DropdownMenuItem onClick={() => window.location.href = `mailto:${customer.email}`}>
                                                <Mail className="mr-2 h-4 w-4" /> Email Customer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>View Order History</DropdownMenuItem>
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