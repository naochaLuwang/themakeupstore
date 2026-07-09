"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { purchaseGiftCard } from "@/app/actions/gift-cards"
import { Gift, Copy, Check, Loader2, ChevronLeft, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

const PRESETS = [500, 1000, 2000, 5000]

const currency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

function GiftCardPreview({ amount, recipientName, message, code }: {
  amount: number
  recipientName: string
  message: string
  code?: string
}) {
  return (
    <div
      className="relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden shadow-xl"
      style={{
        background: "linear-gradient(135deg, #fc2779 0%, #e91e63 40%, #c2185b 100%)",
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute top-1/2 right-8 w-24 h-24 rounded-full bg-white/5" />

      {/* Sparkle dots */}
      <div className="absolute top-6 right-8">
        <Sparkles className="w-5 h-5 text-white/30" />
      </div>
      <div className="absolute bottom-20 left-6">
        <Sparkles className="w-3 h-3 text-white/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-5 md:p-7">
        {/* Top: Brand */}
        <div>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-white/80" />
            <span className="text-[9px] font-bold text-white/60 uppercase tracking-[0.25em]">Gift Card</span>
          </div>
          <h3 className="text-lg md:text-xl font-black tracking-tight font-daciana text-white leading-none mt-1.5">
            THE MAKEUP STORE
          </h3>
          <span className="text-[6px] md:text-[7px] font-bold tracking-[0.35em] text-white/40 uppercase">
            WANGKHEI
          </span>
        </div>

        {/* Middle: Amount + Recipient */}
        <div className="text-center">
          <p className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm">
            {currency(amount)}
          </p>
          {recipientName && (
            <p className="text-sm md:text-base font-semibold text-white/90 mt-2">
              for {recipientName}
            </p>
          )}
          {message && (
            <p className="text-[11px] text-white/60 mt-1.5 line-clamp-1 italic">&ldquo;{message}&rdquo;</p>
          )}
        </div>

        {/* Bottom: Code */}
        {code && (
          <div className="text-center">
            <div className="inline-block bg-white/15 backdrop-blur-sm rounded-lg px-4 py-1.5">
              <span className="text-[10px] md:text-[11px] font-mono font-bold tracking-[0.2em] text-white">
                {code}
              </span>
            </div>
          </div>
        )}

        {/* Decorative bottom band */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10" />
      </div>
    </div>
  )
}

export default function GiftCardsPage() {
  const router = useRouter()
  const [amount, setAmount] = useState<number>(500)
  const [customAmount, setCustomAmount] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ code: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handlePreset = (val: number) => {
    setAmount(val)
    setCustomAmount("")
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "")
    setCustomAmount(val)
    if (val) setAmount(Number(val))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount < 100) return toast.error("Minimum gift card amount is ₹100")
    if (amount > 25000) return toast.error("Maximum gift card amount is ₹25,000")
    setLoading(true)
    const fd = new FormData()
    fd.set("amount", String(amount))
    fd.set("recipient_name", recipientName)
    fd.set("recipient_email", recipientEmail)
    fd.set("message", message)
    const res = await purchaseGiftCard(fd)
    setLoading(false)
    if (res.success) {
      setResult({ code: res.giftCard.code })
    } else {
      toast.error(res.message || "Something went wrong")
    }
  }

  const copyCode = () => {
    if (result) {
      navigator.clipboard.writeText(result.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#FDFBF7" }}>
        <div className="max-w-lg mx-auto px-5 pt-12 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: "#fce4ec" }}>
              <Gift className="w-8 h-8" style={{ color: "#fc2779" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Gift Card Ready!</h1>
              <p className="text-sm text-slate-400 mt-1">Share this card with your recipient</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
          >
            <GiftCardPreview
              amount={amount}
              recipientName={recipientName}
              message={message}
              code={result.code}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 space-y-4"
          >
            <button
              onClick={copyCode}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98]"
              style={{
                backgroundColor: "#fc2779",
                color: "white",
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Gift Card Code"}
            </button>

            {recipientEmail && (
              <p className="text-xs text-slate-400 text-center">
                A confirmation was sent to {recipientEmail}
              </p>
            )}

            <div className="flex items-center justify-center gap-4 pt-2">
              <Link href="/" className="text-sm font-bold text-slate-800 underline underline-offset-2">
                Back to Home
              </Link>
              <button
                onClick={() => setResult(null)}
                className="text-sm font-semibold text-slate-400 hover:text-slate-800 transition-colors"
              >
                Buy Another
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDFBF7" }}>
      <div className="max-w-lg mx-auto px-5 pt-6 pb-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-800 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>

        {/* Live Preview */}
        <div className="mb-8">
          <GiftCardPreview
            amount={amount}
            recipientName={recipientName}
            message={message}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount Selection */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider">Choose Amount</label>
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`h-12 rounded-xl text-sm font-bold border-2 transition-all ${
                    amount === preset && !customAmount
                      ? "text-white"
                      : "bg-white text-slate-800 border-slate-200 hover:border-slate-400"
                  }`}
                  style={
                    amount === preset && !customAmount
                      ? { borderColor: "#fc2779", backgroundColor: "#fc2779", color: "white" }
                      : {}
                  }
                >
                  {currency(preset)}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Custom amount"
                value={customAmount}
                onChange={handleCustomChange}
                className="w-full h-12 pl-8 pr-4 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-800 focus:outline-none transition-colors placeholder:text-slate-300"
                onFocus={(e) => e.target.style.borderColor = "#fc2779"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>
            <p className="text-[11px] text-slate-400">₹100 – ₹25,000</p>
          </div>

          {/* Recipient Details */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider">Recipient Details</label>
            <input
              type="text"
              placeholder="Recipient name (optional)"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none transition-colors placeholder:text-slate-300"
              onFocus={(e) => e.target.style.borderColor = "#fc2779"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
            <input
              type="email"
              placeholder="Recipient email (optional)"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none transition-colors placeholder:text-slate-300"
              onFocus={(e) => e.target.style.borderColor = "#fc2779"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
            <textarea
              placeholder="Add a personal message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none transition-colors placeholder:text-slate-300 resize-none"
              onFocus={(e) => e.target.style.borderColor = "#fc2779"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg"
            style={{
              backgroundColor: "#fc2779",
              color: "white",
              boxShadow: "0 4px 14px rgba(252,39,121,0.3)",
            }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Purchase Gift Card — {currency(amount)}</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
