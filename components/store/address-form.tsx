"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, MapPin } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

export function AddressForm({ userId }: { userId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [fetchingZip, setFetchingZip] = useState(false)

    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        street: "",
        pincode: "",
        city: "",
        state: "",
        label: "Home",
        is_default: false
    })

    // Auto-fill City/State based on Pincode (India Post API Example)
    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const pin = e.target.value.replace(/\D/g, '').slice(0, 6)
        setFormData({ ...formData, pincode: pin })

        if (pin.length === 6) {
            setFetchingZip(true)
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
                const data = await res.json()
                if (data[0].Status === "Success") {
                    const postOffice = data[0].PostOffice[0]
                    setFormData(prev => ({
                        ...prev,
                        city: postOffice.District,
                        state: postOffice.State
                    }))
                    toast.success("Location identified")
                }
            } catch (err) {
                console.error("Pincode fetch error")
            } finally {
                setFetchingZip(false)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        const { error } = await supabase
            .from("user_addresses")
            .insert([{ ...formData, user_id: userId }])

        if (error) {
            toast.error(error.message)
        } else {
            toast.success("Destination added to Maison book")
            router.push("/profile/addresses")
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-10 animate-in fade-in slide-in-from-bottom duration-500">
            {/* Label Toggle */}
            <div className="flex gap-3">
                {['Home', 'Office', 'Studio'].map((l) => (
                    <button
                        key={l}
                        type="button"
                        onClick={() => setFormData({ ...formData, label: l })}
                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${formData.label === l ? "bg-slate-900 text-white shadow-lg" : "bg-zinc-50 text-zinc-400"
                            }`}
                    >
                        {l}
                    </button>
                ))}
            </div>

            {/* Input Fields */}
            <div className="space-y-6">
                <div className="relative group">
                    <input
                        required
                        placeholder="RECIPIENT FULL NAME"
                        className="w-full bg-transparent border-b border-zinc-100 py-3 text-sm font-bold uppercase tracking-tight outline-none focus:border-primary transition-all placeholder:text-zinc-200"
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <input
                        required
                        placeholder="PHONE"
                        className="w-full bg-transparent border-b border-zinc-100 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <div className="relative">
                        <input
                            required
                            placeholder="PINCODE"
                            className="w-full bg-transparent border-b border-zinc-100 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
                            value={formData.pincode}
                            onChange={handlePincodeChange}
                        />
                        {fetchingZip && <Loader2 className="absolute right-0 top-3 w-4 h-4 animate-spin text-primary" />}
                    </div>
                </div>

                <input
                    required
                    placeholder="STREET ADDRESS / HOUSE NO."
                    className="w-full bg-transparent border-b border-zinc-100 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
                    value={formData.street}
                    onChange={e => setFormData({ ...formData, street: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-8 opacity-60">
                    <input readOnly placeholder="CITY" className="w-full bg-transparent border-b border-zinc-100 py-3 text-xs font-bold pointer-events-none" value={formData.city} />
                    <input readOnly placeholder="STATE" className="w-full bg-transparent border-b border-zinc-100 py-3 text-xs font-bold pointer-events-none" value={formData.state} />
                </div>
            </div>

            {/* Default Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${formData.is_default ? "bg-primary border-primary" : "border-zinc-200"}`}>
                    <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.is_default}
                        onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                    />
                    {formData.is_default && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-slate-900 transition-colors">Set as Primary Destination</span>
            </label>

            <button
                type="submit"
                disabled={loading || !formData.city}
                className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-[11px] uppercase tracking-[0.25em] hover:bg-black active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-3"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Destination"}
            </button>
        </form>
    )
}