"use server"

import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/lib/admin"
import { encryptToken, decryptToken } from "@/lib/whatsapp/encryption"
import { sendTemplateMessage, sendTextMessage } from "@/lib/whatsapp/meta-api"
import { buildTemplateComponents } from "@/lib/whatsapp/template-builder"
import { formatPhoneE164 } from "@/lib/whatsapp/phone-utils"
import { revalidatePath } from "next/cache"

export async function saveWhatsAppConfig(formData: FormData) {
  const { supabase } = await requireAdmin()

  const phoneNumberId = formData.get('phone_number_id') as string
  const wabaId = formData.get('waba_id') as string
  const businessAccountId = formData.get('business_account_id') as string
  const accessToken = formData.get('access_token') as string
  const verifyToken = formData.get('verify_token') as string
  const webhookSecret = formData.get('webhook_secret') as string

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'Phone Number ID and Access Token are required' }
  }

  const encrypted = encryptToken(accessToken)

  const { data: existing } = await supabase
    .from('whatsapp_config')
    .select('id')
    .limit(1)

  if (existing && existing.length > 0) {
    await supabase
      .from('whatsapp_config')
      .update({
        phone_number_id: phoneNumberId,
        waba_id: wabaId || null,
        business_account_id: businessAccountId || null,
        access_token: encrypted,
        verify_token: verifyToken || '',
        webhook_secret: webhookSecret || '',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing[0].id)
  } else {
    await supabase
      .from('whatsapp_config')
      .insert({
        phone_number_id: phoneNumberId,
        waba_id: wabaId || null,
        business_account_id: businessAccountId || null,
        access_token: encrypted,
        verify_token: verifyToken || '',
        webhook_secret: webhookSecret || '',
        is_active: true
      })
  }

  revalidatePath('/admin/whatsapp')
  return { success: true }
}

export async function getWhatsAppConfig() {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('whatsapp_config')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (!data) return null

  try {
    const decrypted = decryptToken(data.access_token)
    return { ...data, access_token: decrypted }
  } catch {
    return { ...data, access_token: '' }
  }
}

export async function getMessageTemplates() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('message_templates')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export async function saveMessageTemplate(formData: FormData) {
  const { supabase } = await requireAdmin()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const category = formData.get('category') as string || 'UTILITY'
  const language = formData.get('language') as string || 'en_US'
  const headerType = formData.get('header_type') as string || null
  const headerContent = formData.get('header_content') as string || null
  const bodyText = formData.get('body_text') as string
  const footerText = formData.get('footer_text') as string || null
  const status = formData.get('status') as string || 'APPROVED'
  const metaTemplateId = formData.get('meta_template_id') as string || null

  if (!name || !bodyText) {
    return { success: false, error: 'Name and body text are required' }
  }

  const payload: any = {
    name: name.trim(),
    category,
    language,
    header_type: headerType,
    header_content: headerContent,
    body_text: bodyText.trim(),
    footer_text: footerText,
    status,
    meta_template_id: metaTemplateId,
    updated_at: new Date().toISOString()
  }

  if (id) {
    await supabase.from('message_templates').update(payload).eq('id', id)
  } else {
    await supabase.from('message_templates').insert(payload)
  }

  revalidatePath('/admin/whatsapp')
  return { success: true }
}

export async function deleteMessageTemplate(id: string) {
  const { supabase } = await requireAdmin()
  await supabase.from('message_templates').delete().eq('id', id)
  revalidatePath('/admin/whatsapp')
  return { success: true }
}

export async function sendOrderNotification(
  orderId: string,
  phone: string,
  status: string,
  customerName?: string
) {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('is_active', true)
    .single()

  if (!config) return { sent: false, reason: 'WhatsApp not configured' }

  const templateMap: Record<string, string> = {
    confirmed: 'order_confirmed',
    processing: 'order_processing',
    shipped: 'order_shipped',
    delivered: 'order_delivered',
    cancelled: 'order_cancelled'
  }

  const templateName = templateMap[status]
  if (!templateName) return { sent: false, reason: `No template for status: ${status}` }

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, order_items(product_name, quantity)')
    .eq('id', orderId)
    .single()

  if (!order) return { sent: false, reason: 'Order not found' }

  const itemSummary = order.order_items
    ?.slice(0, 2)
    .map((i: any) => `${i.product_name} × ${i.quantity}`)
    .join(', ') || ''

  const accessToken = decryptToken(config.access_token)
  const to = formatPhoneE164(phone)
  const trackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://themakeupstorewangkhei.com'}/profile/orders/${orderId}`

  const { data: template } = await supabase
    .from('message_templates')
    .select('*')
    .eq('name', templateName)
    .eq('status', 'APPROVED')
    .single()

  if (!template) return { sent: false, reason: `Template "${templateName}" not found or not approved` }

  const components = buildTemplateComponents(template.body_text, {
    body: [
      customerName || 'Valued Customer',
      order.order_number || orderId.slice(0, 8),
      status,
      itemSummary || 'Your items',
      trackUrl
    ],
    buttonParams: { '0': trackUrl }
  })

  const result = await sendTemplateMessage(
    { phoneNumberId: config.phone_number_id, accessToken },
    { to, templateName, language: template.language || 'en_US', components }
  )

  if (result.success) {
    await supabase.from('notification_log').insert({
      order_id: orderId,
      customer_phone: to,
      template_name: templateName,
      template_params: { body: [customerName, order.order_number, status, itemSummary, trackUrl] },
      whatsapp_message_id: result.messageId,
      status: 'sent'
    })
  }

  return { sent: result.success, messageId: result.messageId, error: result.error }
}
