import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

serve(async (req) => {
  try {
    const { email, userName, itemCount, itemNames, cartUrl } = await req.json()

    if (!email || !userName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

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
            You have <strong style="color: #fff">${itemCount} item${itemCount !== 1 ? "s" : ""}</strong> in your cart
            ${itemNames ? `<br><span style="color: #666; font-size: 11px;">${itemNames}</span>` : ""}
            <br><br>Complete your purchase before they sell out.
          </p>
        </div>
        <div style="text-align: center; margin-bottom: 50px;">
          <a href="${cartUrl}" style="font-size: 10px; color: #000; background-color: #fff; text-decoration: none; padding: 16px 35px; display: inline-block; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Return to Cart</a>
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
      console.error("Resend error:", res.status, text)
      return new Response(text, { status: 502 })
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("send-abandoned-cart error:", err)
    return new Response("Internal error", { status: 500 })
  }
})
