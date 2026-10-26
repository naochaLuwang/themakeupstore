import { createHash, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"

const COOKIE_NAME = "label_auth"
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000

const attempts = new Map<string, { count: number; ts: number }>()

function expectedToken(): string | null {
    const pin = process.env.LABEL_PIN
    if (!pin) return null
    return createHash("sha256").update(`tms-label:${pin}`).digest("hex")
}

function hashPin(pin: string): string {
    return createHash("sha256").update(`tms-label:${pin}`).digest("hex")
}

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const now = Date.now()

    const rec = attempts.get(ip)
    if (rec && now - rec.ts < WINDOW_MS && rec.count >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 })
    }

    const expected = expectedToken()
    if (!expected) {
        return NextResponse.json({ error: "LABEL_PIN is not configured on the server." }, { status: 503 })
    }

    const body = await req.json().catch(() => null)
    const pin = typeof body?.pin === "string" ? body.pin.trim() : ""

    if (!/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ error: "Enter the 4-6 digit PIN." }, { status: 400 })
    }

    const entered = Buffer.from(hashPin(pin))
    const target = Buffer.from(expected)
    const ok = entered.length === target.length && timingSafeEqual(entered, target)

    if (!ok) {
        attempts.set(ip, { count: (rec && now - rec.ts < WINDOW_MS ? rec.count : 0) + 1, ts: now })
        return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 })
    }

    attempts.delete(ip)

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, expected, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
    })
    return res
}
