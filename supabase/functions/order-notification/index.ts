import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const SB_URL = Deno.env.get("SB_URL")
const SB_SERVICE_ROLE = Deno.env.get("SB_SERVICE_ROLE")

serve(async (req) => {
  try {
    const { record, old_record, type } = await req.json()

    if (type === "UPDATE" && record.status === old_record?.status) {
      return new Response("Status unchanged", { status: 200 })
    }

    const supabase = createClient(SB_URL, SB_SERVICE_ROLE)

    const [userRes, itemsRes] = await Promise.all([
      supabase.auth.admin.getUserById(record.user_id),
      supabase
        .from("order_items")
        .select(`
          product_name,
          variant_title,
          quantity,
          product_variants:product_variant_id (image_url),
          products:product_id (thumbnail_url)
        `)
        .eq("order_id", record.id),
    ])

    if (userRes.error || !userRes.data.user) return new Response("User not found", { status: 200 })

    const customerEmail = userRes.data.user.email
    const customerName = record.shipping_address?.full_name || "Customer"
    const orderIdShort = record.id.split("-")[0].toUpperCase()

    const itemsHtml = (itemsRes.data || []).map((item: any) => {
      const img = item.product_variants?.image_url || item.products?.thumbnail_url || 'https://themakeupstorewangkhei.com/placeholder.png'

      return `
        <tr>
          <td style="padding: 20px 0; border-bottom: 1px solid #333; width: 60px;">
            <img src="${img}" style="width: 50px; height: 50px; border-radius: 0; object-fit: cover; filter: grayscale(100%); border: 1px solid #444;" />
          </td>
          <td style="padding: 20px 10px; border-bottom: 1px solid #333;">
            <div style="font-size: 12px; font-weight: 500; color: #fff; text-transform: uppercase; letter-spacing: 1px;">${item.product_name}</div>
            <div style="font-size: 10px; color: #666; margin-top: 4px; text-transform: uppercase;">${item.variant_title || ''}</div>
          </td>
          <td style="padding: 20px 0; border-bottom: 1px solid #333; text-align: right; font-size: 11px; color: #fff; font-weight: 300;">
            QTY ${item.quantity}
          </td>
        </tr>`
    }).join("")

    const statusMap: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      paid: "Paid",
      processing: "Processing",
      shipped: "Dispatched",
      out_for_delivery: "Out for Delivery",
      failed_delivery: "Delivery Failed",
      delivered: "Delivered",
      ready_for_pickup: "Ready for Pickup",
      picked_up: "Picked Up",
      no_show: "No Show",
      cancelled: "Cancelled",
    }

    const statusLabel = statusMap[record.status] || record.status
    const orderType = record.order_type || "delivery"
    const isPickup = orderType === "pickup"

    const fulfillmentLine = isPickup
      ? `<p style="font-size: 11px; color: #666; margin-top: 30px; text-transform: uppercase; letter-spacing: 1px;">Fulfillment: Store Pickup</p>`
      : `<p style="font-size: 11px; color: #666; margin-top: 30px; text-transform: uppercase; letter-spacing: 1px;">Fulfillment: Delivery</p>`

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "The Makeup Store Wangkhei <no-reply@themakeupstorewangkhei.com>",
        to: [customerEmail],
        subject: `Order #${orderIdShort}: ${statusLabel}`,
        html: `
<div style="background-color: #000; color: #fff; font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: auto; padding: 60px 20px; background-color: #000;">
    <tr>
      <td>
        <div style="text-align: center; margin-bottom: 60px;">
          <h1 style="font-size: 13px; letter-spacing: 6px; font-weight: 400; margin: 0; text-transform: uppercase; color: #fff;">The Makeup Store</h1>
        </div>

        <div style="margin-bottom: 50px; text-align: center;">
          <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 12px;">Order Status</p>
          <p style="font-size: 22px; font-weight: 300; margin: 0; letter-spacing: 1px;">${statusLabel}</p>
          ${fulfillmentLine}
        </div>

        <div style="margin-bottom: 30px;">
          <p style="font-size: 13px; color: #999; font-weight: 300;">Hi ${customerName}, your order #${orderIdShort} has been updated.</p>
        </div>

        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 50px;">
          ${itemsHtml}
        </table>

        <div style="text-align: center; margin-top: 20px;">
          <a href="https://themakeupstorewangkhei.com/profile/orders/${record.id}" style="font-size: 10px; color: #000; background-color: #fff; text-decoration: none; padding: 16px 35px; display: inline-block; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Track Order</a>
        </div>

        <div style="margin-top: 100px; padding-top: 40px; text-align: center; border-top: 1px solid #222;">
          <p style="font-size: 9px; color: #444; letter-spacing: 2px; margin-bottom: 25px; text-transform: uppercase;">Wangkhei, Manipur</p>
          <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 2px;">
            <a href="https://themakeupstorewangkhei.com/contact" style="color: #666; text-decoration: none; margin: 0 12px;">Support</a>
            <a href="https://themakeupstorewangkhei.com/profile" style="color: #666; text-decoration: none; margin: 0 12px;">Account</a>
          </div>
          <p style="font-size: 8px; color: #333; margin-top: 50px; letter-spacing: 1px;">&copy; 2026 THE MAKEUP STORE</p>
        </div>
      </td>
    </tr>
  </table>
</div>
`
      })
    })


    if (type === "INSERT") {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Makeup Store Alerts <no-reply@themakeupstorewangkhei.com>",
          to: ["luwangtech0@gmail.com","louis.aquarius12@gmail.com"],
          subject: `NEW ORDER: ₹${record.total} from ${customerName}`,
          html: `
            <div style="background-color: #f9fafb; padding: 40px 20px; font-family: sans-serif;">
              <div style="max-width: 600px; margin: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px;">
                <h2 style="margin: 0 0 20px; color: #111827; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">New Order Received</h2>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                  <p style="margin: 0; font-size: 24px; font-weight: 800; color: #4F46E5;">₹${record.total.toLocaleString()}</p>
                  <p style="margin: 5px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Order ID: #${record.id}</p>
                </div>

                <table width="100%" style="margin-bottom: 25px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280;">Customer</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; font-weight: 600; text-align: right;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280;">Contact</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; font-weight: 600; text-align: right;">${record.shipping_address?.phone || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280;">Fulfillment</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; font-weight: 600; text-align: right; text-transform: uppercase;">${orderType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280;">Payment</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; font-weight: 600; text-align: right;">${record.payment_method}</td>
                  </tr>
                </table>

                <div style="text-align: center;">
                  <a href="https://themakeupstorewangkhei.com/admin/orders/${record.id}"
                     style="background: #000; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-size: 12px; font-weight: 700; display: inline-block; text-transform: uppercase;">
                     View in Dashboard
                  </a>
                </div>
              </div>
            </div>
          `
        })
      })
    }

    return new Response(JSON.stringify(await res.json()), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
