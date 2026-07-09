import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const SB_URL = Deno.env.get("SB_URL")
const SB_SERVICE_ROLE = Deno.env.get("SB_SERVICE_ROLE")
const CRON_SECRET = Deno.env.get("CRON_SECRET")

serve(async (req) => {
  try {
    if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 })
    }

    if (!RESEND_API_KEY || !SB_URL || !SB_SERVICE_ROLE) {
      console.error("Missing env vars")
      return new Response("Server config error", { status: 500 })
    }

    const supabase = createClient(SB_URL, SB_SERVICE_ROLE)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: carts, error } = await supabase
      .from("carts")
      .select(`
        id, user_id,
        profiles!inner(id, email, full_name),
        cart_items(product_id,
          products!inner(id, name))
      `)
      .lt("updated_at", oneHourAgo)
      .is("abandoned_email_sent_at", null)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Query error:", error)
      return new Response("Query failed", { status: 500 })
    }

    if (!carts || carts.length === 0) {
      return new Response("No abandoned carts found", { status: 200 })
    }

    let sent = 0
    let failed = 0
    const siteUrl = "https://themakeupstorewangkhei.com"

    for (const cart of carts) {
      const profile = (cart as any).profiles as any
      const email = profile?.email
      const userName = profile?.full_name || "there"
      const items = (cart as any).cart_items || []
      const itemNames = items
        .map((i: any) => (i as any).products?.name)
        .filter(Boolean)
        .join(", ")

      if (!email) continue

      try {
        const html = `
<div style="background-color: #000; color: #fff; font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: auto; padding: 60px 20px; background-color: #000;">
    <tr>
      <td>
        <div style="text-align: center; margin-bottom: 50px;">
          <h1 style="font-size: 13px; letter-spacing: 6px; font-weight: 400; margin: 0; text-transform: uppercase; color: #fff;">The Makeup Store</h1>
        </div>
        <div style="margin-bottom: 40px; text-align: center;">
          <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px;">You left something behind</p>
          <p style="font-size: 22px; font-weight: 300; margin: 0; letter-spacing: 1px;">Hey ${userName}, your bag is waiting!</p>
        </div>
        <div style="margin-bottom: 40px; text-align: center;">
          <p style="font-size: 13px; color: #999; font-weight: 300; margin: 0;">
            You have <strong style="color: #fff">${items.length} item${items.length !== 1 ? "s" : ""}</strong> in your cart
            ${itemNames ? `<br><span style="color: #666; font-size: 11px;">${itemNames}</span>` : ""}
            <br><br>Complete your purchase before they sell out.
          </p>
        </div>
        <div style="text-align: center; margin-bottom: 50px;">
          <a href="${siteUrl}/cart" style="font-size: 10px; color: #000; background-color: #fff; text-decoration: none; padding: 16px 35px; display: inline-block; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Return to Cart</a>
        </div>
        <div style="margin-top: 60px; padding-top: 40px; text-align: center; border-top: 1px solid #222;">
          <p style="font-size: 9px; color: #444; letter-spacing: 2px; margin-bottom: 25px; text-transform: uppercase;">Wangkhei, Manipur</p>
          <p style="font-size: 8px; color: #333; margin-top: 10px; letter-spacing: 1px;">You received this because you saved items to your cart but didn't complete checkout.</p>
        </div>
      </td>
    </tr>
  </table>
</div>`

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "The Makeup Store Wangkhei <no-reply@themakeupstorewangkhei.com>",
            to: [email],
            subject: `Complete your order, ${userName} 🛍️`,
            html,
          }),
        })

        if (!res.ok) {
          const text = await res.text()
          console.error("Resend error for", email, res.status, text)
          failed++
          continue
        }

        await supabase
          .from("carts")
          .update({ abandoned_email_sent_at: new Date().toISOString() })
          .eq("id", cart.id)

        sent++
      } catch (err) {
        console.error("Error processing cart", cart.id, err)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("scheduled-abandoned-cart error:", err)
    return new Response("Internal error", { status: 500 })
  }
})
