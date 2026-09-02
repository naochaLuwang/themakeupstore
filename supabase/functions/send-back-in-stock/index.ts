import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

serve(async (req) => {
  try {
    const { email, userName, productName, variantName, productUrl, imageUrl } = await req.json()

    if (!email || !userName || !productName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const baseUrl = "https://themakeupstorewangkhei.com"
    const finalProductUrl = productUrl || baseUrl
    const defaultImage = "https://themakeupstorewangkhei.com/forever.png"
    const finalImageUrl = imageUrl || defaultImage

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Back in Stock</title>
</head>
<body style="background-color: #000000; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #222222; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 32px 24px 24px 24px; border-bottom: 1px solid #1a1a1a;">
              <h1 style="font-size: 11px; letter-spacing: 5px; font-weight: 600; margin: 0; text-transform: uppercase; color: #888888;">The Makeup Store</h1>
            </td>
          </tr>
          
          <!-- Hero Image -->
          <tr>
            <td align="center" style="padding: 32px 24px 16px 24px;">
              <a href="${finalProductUrl}" target="_blank" style="text-decoration: none;">
                <img src="${finalImageUrl}" alt="${productName}" width="200" height="200" style="width: 200px; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #222222; display: block;" />
              </a>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td align="center" style="padding: 16px 32px 32px 32px;">
              <p style="font-size: 10px; color: #ec4899; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 12px 0; font-weight: 700;">Back in Stock Alert</p>
              <h2 style="font-size: 20px; font-weight: 300; margin: 0 0 8px 0; color: #ffffff; letter-spacing: 0.5px;">Hello, ${userName}!</h2>
              <p style="font-size: 14px; color: #cccccc; font-weight: 300; line-height: 1.6; margin: 0 0 24px 0;">
                The item you've been waiting for is finally back on our shelves and ready for order.
              </p>

              <!-- Product Details Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #141414; border: 1px solid #262626; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 16px 20px; text-align: left;">
                    <p style="font-size: 15px; font-weight: 600; color: #ffffff; margin: 0 0 ${variantName ? '6px' : '0'} 0;">${productName}</p>
                    ${variantName ? `<p style="font-size: 12px; color: #888888; margin: 0;">Variant: <span style="color: #cccccc;">${variantName}</span></p>` : ""}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #ffffff;">
                    <a href="${finalProductUrl}" target="_blank" style="font-size: 11px; font-weight: 700; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 6px; display: inline-block; letter-spacing: 2px; text-transform: uppercase;">Shop Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px; background-color: #050505; border-top: 1px solid #1a1a1a;">
              <p style="font-size: 9px; color: #555555; letter-spacing: 2px; margin: 0 0 8px 0; text-transform: uppercase;">Wangkhei, Manipur</p>
              <p style="font-size: 9px; color: #444444; margin: 0; line-height: 1.5;">You received this email because you signed up for back-in-stock notifications at The Makeup Store.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "The Makeup Store Wangkhei <no-reply@themakeupstorewangkhei.com>",
        to: [email],
        subject: `Back in Stock: ${productName}${variantName ? ` — ${variantName}` : ""}`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("Resend error:", err)
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
