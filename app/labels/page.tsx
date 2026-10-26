import { cookies } from "next/headers"
import { createHash, timingSafeEqual } from "crypto"
import type { Metadata } from "next"
import { LabelMaker } from "./label-maker"
import { PinGate } from "./pin-gate"

export const metadata: Metadata = {
    title: "Label Maker",
    robots: { index: false, follow: false },
}

function expectedToken(pin: string): string {
    return createHash("sha256").update(`tms-label:${pin}`).digest("hex")
}

function tokenMatches(value: string | undefined, expected: string): boolean {
    if (!value) return false
    const a = Buffer.from(value)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
}

export default async function LabelsPage() {
    const pin = process.env.LABEL_PIN

    if (!pin) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-xl font-black text-slate-900 mb-2">Label Maker is not configured</h1>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Set the <code className="font-mono font-bold text-slate-700">LABEL_PIN</code> environment
                        variable (4-6 digits) on the server, then restart.
                    </p>
                </div>
            </div>
        )
    }

    const cookieStore = await cookies()
    const auth = cookieStore.get("label_auth")?.value
    const valid = tokenMatches(auth, expectedToken(pin))

    return valid ? <LabelMaker /> : <PinGate />
}
