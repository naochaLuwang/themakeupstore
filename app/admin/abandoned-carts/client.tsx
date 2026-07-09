"use client"

import { useState } from "react"
import { sendRecoveryEmails } from "@/app/actions/cart"
import { Mail, Loader2, CheckCircle2, Clock, User, ShoppingBag } from "lucide-react"
import Link from "next/link"

export function AbandonedCartsClient({ carts }: { carts: any[] }) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; debug?: any[] } | null>(null)

  const handleSend = async () => {
    setSending(true)
    const res = await sendRecoveryEmails()
    setResult(res)
    setSending(false)
  }

  const emailed = carts.filter((c: any) => c.abandoned_email_sent_at)
  const pending = carts.filter((c: any) => !c.abandoned_email_sent_at && new Date(c.updated_at) < new Date(Date.now() - 60 * 60 * 1000))
  const recent = carts.filter((c: any) => new Date(c.updated_at) >= new Date(Date.now() - 60 * 60 * 1000))

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-2xl font-black tracking-tight">{pending.length}</p>
          <p className="text-xs text-slate-500 mt-1">Pending Recovery</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-2xl font-black tracking-tight">{emailed.length}</p>
          <p className="text-xs text-slate-500 mt-1">Emails Sent</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-2xl font-black tracking-tight">{recent.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active Recently</p>
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={sending || pending.length === 0}
          className="inline-flex items-center gap-2 rounded-xl h-10 px-5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {sending ? "Sending..." : `Send Recovery Emails (${pending.length})`}
        </button>
        {result && (
          <span className="text-xs text-emerald-600 font-semibold">
            <CheckCircle2 className="w-4 h-4 inline mr-1" />
            Sent: {result.sent}, Failed: {result.failed}
          </span>
        )}
      </div>

      {/* Table */}
      {carts.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
          <ShoppingBag className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">No carts found</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Items</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Active</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Recovery Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carts.map((cart: any) => (
                <tr key={cart.id} className="hover:bg-slate-50/50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{cart.profiles?.full_name || "Unknown"}</p>
                        <p className="text-xs text-slate-400">{cart.profiles?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-900 font-medium">{cart.cart_items?.length || 0} items</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-600">{new Date(cart.updated_at).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {cart.abandoned_email_sent_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sent {new Date(cart.abandoned_email_sent_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Note about Edge Function */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
        <p className="font-semibold mb-1">Note:</p>
        <p>Recovery emails are sent via Edge Function <code className="bg-amber-100 px-1 rounded">send-abandoned-cart</code>. A scheduled cron job also runs every 2 hours via pg_cron. Ensure <code className="bg-amber-100 px-1 rounded">RESEND_API_KEY</code> is set as a function secret.</p>
      </div>
    </div>
  )
}
