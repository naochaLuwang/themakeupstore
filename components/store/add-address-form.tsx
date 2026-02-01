"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function AddAddressForm({ userId, onSuccess }: { userId: string, onSuccess: (addr: any) => void }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const newAddress = {
            user_id: userId,
            full_name: formData.get("full_name"),
            phone: formData.get("phone"),
            street: formData.get("street"),
            city: formData.get("city"),
            state: formData.get("state"),
            pincode: formData.get("pincode"),
            label: formData.get("label") || "Home",
            is_default: false
        }

        const { data, error } = await supabase
            .from("user_addresses")
            .insert([newAddress])
            .select()
            .single()

        if (error) {
            toast.error("Failed to save address")
        } else {
            toast.success("Address added")
            onSuccess(data)
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="full_name" placeholder="Full Name" required className="md:col-span-2" />
            <Input name="phone" placeholder="Phone Number" required />
            <Input name="label" placeholder="Label (e.g. Office)" />
            <Input name="street" placeholder="Street / House No." required className="md:col-span-2" />
            <Input name="city" placeholder="City" required />
            <Input name="state" placeholder="State" required />
            <Input name="pincode" placeholder="Pincode" required />
            <Button type="submit" disabled={loading} className="md:col-span-2 bg-slate-900 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Use Address"}
            </Button>
        </form>
    )
}