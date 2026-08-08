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

    const [userRes, itemsRes, partnerRes] = await Promise.all([
      supabase.auth.admin.getUserById(record.user_id),
      supabase
        .from("order_items")
        .select(`
          product_name,
          variant_title,
          quantity,
          unit_price,
          mrp,
          product_variants:product_variant_id (image_url),
          products:product_id (thumbnail_url)
        `)
        .eq("order_id", record.id),
      record.delivery_partner_id
        ? supabase.from("delivery_partners").select("name").eq("id", record.delivery_partner_id).single()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (userRes.error || !userRes.data.user) return new Response("User not found", { status: 200 })

    const customerEmail = userRes.data.user.email
    const customerName = record.shipping_address?.full_name || "Customer"
    const orderIdShort = record.id.split("-")[0].toUpperCase()
    const partnerName = partnerRes.data?.name || null
    const orderType = record.order_type || "delivery"
    const isPickup = orderType === "pickup"

    const addr = record.shipping_address || {}
    const addressParts = [addr.street, addr.landmark, addr.area_name, addr.city, addr.state, addr.pincode].filter(Boolean)
    const fullAddress = addressParts.join(", ")

    // --- Items HTML ---
    const itemsHtml = (itemsRes.data || []).map((item: any) => {
      const img = item.product_variants?.image_url || item.products?.thumbnail_url || "https://themakeupstorewangkhei.com/placeholder.png"
      const itemTotal = item.unit_price * item.quantity
      return `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #1a1a1a; width: 56px; vertical-align: top;">
            <img src="${img}" style="width: 48px; height: 48px; object-fit: cover; border: 1px solid #333;" />
          </td>
          <td style="padding: 16px 0 16px 12px; border-bottom: 1px solid #1a1a1a; vertical-align: top;">
            <div style="font-size: 12px; font-weight: 600; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">${item.product_name}</div>
            ${item.variant_title ? `<div style="font-size: 10px; color: #666; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px;">${item.variant_title}</div>` : ""}
            <div style="font-size: 10px; color: #555; margin-top: 3px;">Qty: ${item.quantity}</div>
          </td>
          <td style="padding: 16px 0; border-bottom: 1px solid #1a1a1a; text-align: right; font-size: 12px; color: #fff; font-weight: 500; vertical-align: top;">
            ₹${itemTotal.toLocaleString("en-IN")}
          </td>
        </tr>`
    }).join("")

    // --- Price breakdown ---
    const subtotal = (itemsRes.data || []).reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0)
    const promoDiscount = record.promo_discount_amount || 0
    const bxgyDiscount = record.bxgy_discount_amount || 0
    const giftDiscount = record.gift_card_discount || 0
    const pointsDiscount = record.points_discount || 0
    const shipping = record.shipping_price || 0
    const extraCharges = record.additional_charges || 0

    const priceBreakdownRows = `
      <tr>
        <td style="padding: 8px 0; font-size: 11px; color: #666;">Subtotal</td>
        <td style="padding: 8px 0; font-size: 11px; color: #999; text-align: right;">₹${subtotal.toLocaleString("en-IN")}</td>
      </tr>
      ${promoDiscount > 0 ? `<tr><td style="padding: 8px 0; font-size: 11px; color: #666;">Promo${record.promo_code ? ` (${record.promo_code})` : ""}</td><td style="padding: 8px 0; font-size: 11px; color: #22c55e; text-align: right;">-₹${promoDiscount.toLocaleString("en-IN")}</td></tr>` : ""}
      ${bxgyDiscount > 0 ? `<tr><td style="padding: 8px 0; font-size: 11px; color: #666;">Buy X Get Y</td><td style="padding: 8px 0; font-size: 11px; color: #22c55e; text-align: right;">-₹${bxgyDiscount.toLocaleString("en-IN")}</td></tr>` : ""}
      ${giftDiscount > 0 ? `<tr><td style="padding: 8px 0; font-size: 11px; color: #666;">Gift Card</td><td style="padding: 8px 0; font-size: 11px; color: #22c55e; text-align: right;">-₹${giftDiscount.toLocaleString("en-IN")}</td></tr>` : ""}
      ${pointsDiscount > 0 ? `<tr><td style="padding: 8px 0; font-size: 11px; color: #666;">Reward Points</td><td style="padding: 8px 0; font-size: 11px; color: #22c55e; text-align: right;">-₹${pointsDiscount.toLocaleString("en-IN")}</td></tr>` : ""}
      ${!isPickup ? `<tr><td style="padding: 8px 0; font-size: 11px; color: #666;">Shipping</td><td style="padding: 8px 0; font-size: 11px; color: ${shipping === 0 ? "#22c55e" : "#999"}; text-align: right;">${shipping === 0 ? "FREE" : `₹${shipping.toLocaleString("en-IN")}`}</td></tr>` : ""}
      ${extraCharges > 0 ? `<tr><td style="padding: 8px 0; font-size: 11px; color: #666;">${record.additional_charges_label || "Extra"}</td><td style="padding: 8px 0; font-size: 11px; color: #999; text-align: right;">₹${extraCharges.toLocaleString("en-IN")}</td></tr>` : ""}
      <tr style="border-top: 1px solid #333;">
        <td style="padding: 12px 0 4px; font-size: 12px; font-weight: 700; color: #fff;">Total</td>
        <td style="padding: 12px 0 4px; font-size: 14px; font-weight: 700; color: #fff; text-align: right;">₹${record.total.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 8px; font-size: 10px; color: #555;">${record.payment_method === "COD" ? "Cash on Delivery" : record.payment_method === "razorpay" ? "Paid Online" : record.payment_method}</td>
        <td style="padding: 0 0 8px; font-size: 10px; color: ${record.payment_status === "paid" ? "#22c55e" : "#f59e0b"}; text-align: right;">${record.payment_status === "paid" ? "PAID" : record.payment_status === "refunded" ? "REFUNDED" : "UNPAID"}</td>
      </tr>
    `

    // --- Status-specific content ---
    const statusMessages: Record<string, { heading: string; message: string; accent: string; subject: string }> = {
      confirmed: {
        heading: "Order Confirmed",
        message: `Hi ${customerName}, we've received your order and it's been confirmed. We're now preparing it for ${isPickup ? "pickup" : "dispatch"}.`,
        accent: "#3b82f6",
        subject: `Order #${orderIdShort} Confirmed`,
      },
      paid: {
        heading: "Payment Received",
        message: `Hi ${customerName}, your payment for order #${orderIdShort} has been successfully received. We'll start processing it shortly.`,
        accent: "#22c55e",
        subject: `Order #${orderIdShort} — Payment Received`,
      },
      processing: {
        heading: "Order Processing",
        message: `Hi ${customerName}, your order #${orderIdShort} is now being processed. We're getting everything ready for ${isPickup ? "pickup" : "dispatch"}.`,
        accent: "#f59e0b",
        subject: `Order #${orderIdShort} is Being Processed`,
      },
      shipped: {
        heading: "Order Dispatched",
        message: `Hi ${customerName}, your order #${orderIdShort} has been dispatched and is on its way to you.`,
        accent: "#8b5cf6",
        subject: `Order #${orderIdShort} Dispatched`,
      },
      out_for_delivery: {
        heading: "Out for Delivery",
        message: `Hi ${customerName}, great news! Your order #${orderIdShort} is out for delivery and will reach you soon.`,
        accent: "#06b6d4",
        subject: `Order #${orderIdShort} — Out for Delivery`,
      },
      delivered: {
        heading: "Order Delivered",
        message: `Hi ${customerName}, your order #${orderIdShort} has been delivered. We hope you love your products!`,
        accent: "#22c55e",
        subject: `Order #${orderIdShort} Delivered — Thank You!`,
      },
      failed_delivery: {
        heading: "Delivery Attempted",
        message: `Hi ${customerName}, we tried delivering your order #${orderIdShort} but couldn't complete it. Our team will try again or contact you shortly.`,
        accent: "#ef4444",
        subject: `Order #${orderIdShort} — Delivery Attempted`,
      },
      cancelled: {
        heading: "Order Cancelled",
        message: `Hi ${customerName}, your order #${orderIdShort} has been cancelled.${record.cancellation_reason ? ` Reason: ${record.cancellation_reason}` : ""}`,
        accent: "#ef4444",
        subject: `Order #${orderIdShort} Cancelled`,
      },
      ready_for_pickup: {
        heading: "Ready for Pickup",
        message: `Hi ${customerName}, your order #${orderIdShort} is ready for pickup from our store. Please collect it at your earliest convenience.`,
        accent: "#22c55e",
        subject: `Order #${orderIdShort} — Ready for Pickup`,
      },
      picked_up: {
        heading: "Order Picked Up",
        message: `Hi ${customerName}, your order #${orderIdShort} has been picked up. We hope you love your products!`,
        accent: "#22c55e",
        subject: `Order #${orderIdShort} Picked Up — Thank You!`,
      },
      pending: {
        heading: "Order Placed",
        message: `Hi ${customerName}, we've received your order #${orderIdShort} and it's pending confirmation.`,
        accent: "#6b7280",
        subject: `Order #${orderIdShort} Placed`,
      },
      no_show: {
        heading: "Pickup Not Collected",
        message: `Hi ${customerName}, your order #${orderIdShort} was ready for pickup but hasn't been collected. Please contact us to reschedule.`,
        accent: "#f59e0b",
        subject: `Order #${orderIdShort} — Pickup Pending`,
      },
    }

    const statusInfo = statusMessages[record.status] || {
      heading: "Order Update",
      message: `Hi ${customerName}, your order #${orderIdShort} has been updated to: ${record.status}.`,
      accent: "#6b7280",
      subject: `Order #${orderIdShort} — Update`,
    }

    // --- Status-specific extra blocks ---
    let extraBlocks = ""

    // Shipped / out_for_delivery: show partner + tracking
    if (["shipped", "out_for_delivery", "delivered"].includes(record.status)) {
      const partnerBlock = partnerName
        ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #1a1a1a; font-size: 11px; color: #666;">Delivery Partner</td><td style="padding: 10px 0; border-bottom: 1px solid #1a1a1a; font-size: 11px; color: #fff; text-align: right;">${partnerName}</td></tr>`
        : ""
      const trackingBlock = record.tracking_number
        ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #1a1a1a; font-size: 11px; color: #666;">Tracking</td><td style="padding: 10px 0; border-bottom: 1px solid #1a1a1a; font-size: 11px; color: #fff; text-align: right; font-family: monospace;">${record.tracking_number}</td></tr>`
        : ""
      if (partnerBlock || trackingBlock) {
        extraBlocks += `<div style="margin-bottom: 20px; padding: 16px; border: 1px solid #222; border-radius: 4px;">
          <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px;">Shipping Details</p>
          <table width="100%" cellspacing="0" cellpadding="0">${partnerBlock}${trackingBlock}</table>
        </div>`
      }
    }

    // Cancelled: show reason
    if (record.status === "cancelled" && record.cancellation_reason) {
      extraBlocks += `<div style="margin-bottom: 20px; padding: 16px; border: 1px solid #7f1d1d; border-radius: 4px; background: rgba(127,29,29,0.1);">
        <p style="font-size: 10px; color: #ef4444; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Cancellation Reason</p>
        <p style="font-size: 12px; color: #fca5a5; margin: 0; line-height: 1.5;">${record.cancellation_reason}</p>
        ${record.cancelled_by ? `<p style="font-size: 10px; color: #666; margin: 8px 0 0;">Cancelled by: ${record.cancelled_by === "admin" ? "Store" : "Customer"}</p>` : ""}
      </div>`
    }

    // Failed delivery: extra note
    if (record.status === "failed_delivery") {
      extraBlocks += `<div style="margin-bottom: 20px; padding: 16px; border: 1px solid #7f1d1d; border-radius: 4px; background: rgba(127,29,29,0.1);">
        <p style="font-size: 10px; color: #ef4444; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">What Happens Next</p>
        <p style="font-size: 11px; color: #fca5a5; margin: 0; line-height: 1.5;">Our delivery partner will attempt delivery again. If you have any questions, please contact us.</p>
      </div>`
    }

    // --- Delivery address block ---
    const addressBlock = fullAddress ? `<div style="margin-bottom: 20px; padding: 16px; border: 1px solid #222; border-radius: 4px;">
      <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">${isPickup ? "Pickup From" : "Deliver To"}</p>
      <p style="font-size: 11px; color: #ccc; margin: 0; line-height: 1.6;">
        ${customerName}${addr.phone ? `<br>${addr.phone}` : ""}<br>${fullAddress}
      </p>
    </div>` : ""

    // --- CTA button ---
    const ctaText = record.status === "delivered" ? "Rate Your Order" : record.status === "cancelled" ? "View Details" : "Track Order"
    const ctaBlock = `<div style="text-align: center; margin: 30px 0 10px;">
      <a href="https://themakeupstorewangkhei.com/profile/orders/${record.id}" style="font-size: 10px; color: #000; background-color: ${statusInfo.accent}; text-decoration: none; padding: 14px 32px; display: inline-block; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; border-radius: 2px;">${ctaText}</a>
    </div>`

    // --- Customer email HTML ---
    const customerHtml = `
<div style="background-color: #000; color: #fff; font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: auto; padding: 60px 20px; background-color: #000;">
    <tr>
      <td>
        <div style="text-align: center; margin-bottom: 50px;">
          <h1 style="font-size: 13px; letter-spacing: 6px; font-weight: 400; margin: 0; text-transform: uppercase; color: #fff;">The Makeup Store</h1>
        </div>

        <div style="margin-bottom: 40px; text-align: center;">
          <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 12px;">Order ${orderIdShort}</p>
          <p style="font-size: 22px; font-weight: 300; margin: 0; letter-spacing: 1px; color: ${statusInfo.accent};">${statusInfo.heading}</p>
          ${!isPickup ? `<p style="font-size: 10px; color: #555; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;">Delivery</p>` : `<p style="font-size: 10px; color: #555; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;">Store Pickup</p>`}
        </div>

        <div style="margin-bottom: 30px;">
          <p style="font-size: 12px; color: #999; font-weight: 300; line-height: 1.7;">${statusInfo.message}</p>
        </div>

        ${extraBlocks}
        ${addressBlock}

        <div style="margin-bottom: 30px; padding: 16px; border: 1px solid #222; border-radius: 4px;">
          <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px;">Order Summary</p>
          <table width="100%" cellspacing="0" cellpadding="0">
            ${itemsHtml}
          </table>
          <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 12px; border-top: 1px solid #222; padding-top: 12px;">
            ${priceBreakdownRows}
          </table>
        </div>

        ${ctaBlock}

        <div style="margin-top: 60px; padding-top: 30px; text-align: center; border-top: 1px solid #1a1a1a;">
          <p style="font-size: 9px; color: #333; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">Wangkhei, Manipur</p>
          <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 2px;">
            <a href="https://themakeupstorewangkhei.com/contact" style="color: #555; text-decoration: none; margin: 0 12px;">Support</a>
            <a href="https://themakeupstorewangkhei.com/profile" style="color: #555; text-decoration: none; margin: 0 12px;">Account</a>
          </div>
          <p style="font-size: 8px; color: #222; margin-top: 40px; letter-spacing: 1px;">&copy; 2026 THE MAKEUP STORE</p>
        </div>
      </td>
    </tr>
  </table>
</div>`

    // --- Send customer email ---
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "The Makeup Store <no-reply@themakeupstorewangkhei.com>",
        to: [customerEmail],
        subject: statusInfo.subject,
        html: customerHtml,
      }),
    })

    // --- Admin notification (INSERT only) ---
    if (type === "INSERT") {
      const adminItemsRows = (itemsRes.data || []).map((item: any) => {
        const itemTotal = item.unit_price * item.quantity
        return `
          <tr>
            <td style="padding: 14px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${item.product_name}</div>
              ${item.variant_title ? `<div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${item.variant_title}</div>` : ""}
            </td>
            <td style="padding: 14px 0; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #6b7280;">${item.quantity}</td>
            <td style="padding: 14px 0; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 13px; color: #111827;">₹${itemTotal.toLocaleString("en-IN")}</td>
          </tr>`
      }).join("")

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Makeup Store Alerts <no-reply@themakeupstorewangkhei.com>",
          to: ["luwangtech0@gmail.com", "louis.aquarius12@gmail.com"],
          subject: `NEW ORDER: ₹${record.total.toLocaleString("en-IN")} from ${customerName}`,
          html: `
<div style="background-color: #f5f5f5; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 520px; margin: auto; background: #fff; border: 1px solid #e5e5e5; border-radius: 4px; overflow: hidden;">

    <!-- Header -->
    <div style="background: #000; padding: 28px 30px; text-align: center;">
      <p style="margin: 0; font-size: 14px; letter-spacing: 6px; color: #fff; text-transform: uppercase; font-weight: 300;">The Makeup Store</p>
      <p style="margin: 12px 0 0; font-size: 10px; letter-spacing: 3px; color: #666; text-transform: uppercase;">New Order Received</p>
    </div>

    <div style="padding: 30px;">

      <!-- Order ID + Total -->
      <div style="text-align: center; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #f0f0f0;">
        <p style="margin: 0; font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 3px;">Order</p>
        <p style="margin: 4px 0 0; font-size: 20px; font-weight: 800; color: #111827;">#${orderIdShort}</p>
        <p style="margin: 8px 0 0; font-size: 28px; font-weight: 800; color: #4F46E5;">₹${record.total.toLocaleString("en-IN")}</p>
        <p style="margin: 4px 0 0; font-size: 11px; color: ${record.payment_status === "paid" ? "#16a34a" : "#f59e0b"}; font-weight: 600; text-transform: uppercase;">${record.payment_status === "paid" ? "PAID" : record.payment_status}</p>
      </div>

      <!-- Customer + Order Info -->
      <table width="100%" style="margin-bottom: 24px; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #9ca3af;">Customer</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #111827; font-weight: 600; text-align: right;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #9ca3af;">Phone</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #111827; font-weight: 600; text-align: right;">${addr.phone || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #9ca3af;">Payment</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #111827; font-weight: 600; text-align: right;">${record.payment_method === "COD" ? "Cash on Delivery" : record.payment_method === "razorpay" ? "Razorpay" : record.payment_method}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #9ca3af;">Fulfillment</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #111827; font-weight: 600; text-align: right; text-transform: uppercase;">${orderType}</td>
        </tr>
        ${record.razorpay_payment_id ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #9ca3af;">Payment ID</td><td style="padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 11px; color: #111827; font-weight: 500; text-align: right; font-family: monospace;">${record.razorpay_payment_id}</td></tr>` : ""}
      </table>

      <!-- Address -->
      ${fullAddress ? `<div style="margin-bottom: 24px; padding: 14px 16px; background: #fafafa; border-radius: 4px; border-left: 3px solid #e5e7eb;">
        <p style="margin: 0 0 4px; font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px;">${isPickup ? "Pickup Address" : "Delivery Address"}</p>
        <p style="margin: 0; font-size: 12px; color: #374151; line-height: 1.6;">${fullAddress}</p>
      </div>` : ""}

      <!-- Items -->
      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px;">Items Ordered</p>
        <table width="100%" style="border-collapse: collapse;">
          <tr style="border-bottom: 2px solid #111827;">
            <td style="padding: 8px 0; font-size: 10px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 1px;">Product</td>
            <td style="padding: 8px 0; font-size: 10px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Qty</td>
            <td style="padding: 8px 0; font-size: 10px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 1px; text-align: right;">Amount</td>
          </tr>
          ${adminItemsRows}
        </table>
      </div>

      <!-- Price Breakdown -->
      <div style="margin-bottom: 24px; padding: 16px; background: #fafafa; border-radius: 4px;">
        <table width="100%" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Subtotal</td>
            <td style="padding: 6px 0; font-size: 12px; color: #374151; text-align: right;">₹${subtotal.toLocaleString("en-IN")}</td>
          </tr>
          ${promoDiscount > 0 ? `<tr><td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Promo${record.promo_code ? ` (${record.promo_code})` : ""}</td><td style="padding: 6px 0; font-size: 12px; color: #16a34a; text-align: right;">-₹${promoDiscount.toLocaleString("en-IN")}</td></tr>` : ""}
          ${bxgyDiscount > 0 ? `<tr><td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Buy X Get Y</td><td style="padding: 6px 0; font-size: 12px; color: #16a34a; text-align: right;">-₹${bxgyDiscount.toLocaleString("en-IN")}</td></tr>` : ""}
          ${giftDiscount > 0 ? `<tr><td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Gift Card</td><td style="padding: 6px 0; font-size: 12px; color: #16a34a; text-align: right;">-₹${giftDiscount.toLocaleString("en-IN")}</td></tr>` : ""}
          ${pointsDiscount > 0 ? `<tr><td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Reward Points</td><td style="padding: 6px 0; font-size: 12px; color: #16a34a; text-align: right;">-₹${pointsDiscount.toLocaleString("en-IN")}</td></tr>` : ""}
          <tr>
            <td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Shipping${record.shipping_label ? ` (${record.shipping_label})` : ""}</td>
            <td style="padding: 6px 0; font-size: 12px; color: ${shipping === 0 ? "#16a34a" : "#374151"}; text-align: right;">${shipping === 0 ? "FREE" : `₹${shipping.toLocaleString("en-IN")}`}</td>
          </tr>
          ${extraCharges > 0 ? `<tr><td style="padding: 6px 0; font-size: 12px; color: #6b7280;">${record.additional_charges_label || "Extra"}</td><td style="padding: 6px 0; font-size: 12px; color: #374151; text-align: right;">₹${extraCharges.toLocaleString("en-IN")}</td></tr>` : ""}
          <tr>
            <td style="padding: 12px 0 4px; font-size: 14px; font-weight: 800; color: #111827; border-top: 2px solid #111827;">Total</td>
            <td style="padding: 12px 0 4px; font-size: 16px; font-weight: 800; color: #111827; text-align: right; border-top: 2px solid #111827;">₹${record.total.toLocaleString("en-IN")}</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align: center; padding-top: 8px;">
        <a href="https://themakeupstorewangkhei.com/admin/orders/${record.id}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; border-radius: 2px;">View in Dashboard</a>
      </div>

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
        <p style="margin: 0; font-size: 10px; color: #d1d5db; letter-spacing: 1px;">THE MAKEUP STORE WANGKHEI &bull; MANIPUR</p>
      </div>

    </div>
  </div>
</div>`,
        }),
      })
    }

    return new Response(JSON.stringify(await res.json()), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
