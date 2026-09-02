const EDGE_FUNCTION_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") +
    "/functions/v1/send-back-in-stock"

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function sendBackInStockEmail({
    email,
    userName,
    productName,
    variantName,
    productUrl,
    imageUrl,
}: {
    email: string
    userName: string
    productName: string
    variantName: string
    productUrl?: string
    imageUrl?: string
}) {
    if (!EDGE_FUNCTION_URL || !ANON_KEY) {
        console.warn("Supabase URL or ANON_KEY not set — skipping email")
        return { success: false, skipped: true }
    }

    try {
        const res = await fetch(EDGE_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ANON_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                userName,
                productName,
                variantName,
                productUrl,
                imageUrl,
            }),
        })

        if (!res.ok) {
            const err = await res.text()
            console.error("Edge function error:", err)
            return { success: false, error: err }
        }

        return { success: true }
    } catch (err) {
        console.error("Email send error:", err)
        return { success: false, error: String(err) }
    }
}
