import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { decryptToken } from "@/lib/whatsapp/encryption"
import { sendTemplateMessage, sendTextMessage } from "@/lib/whatsapp/meta-api"
import { buildTemplateComponents } from "@/lib/whatsapp/template-builder"
import { formatPhoneE164 } from "@/lib/whatsapp/phone-utils"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { phone, templateName, bodyParams, headerText, headerMediaUrl, buttonParams } = await req.json()

    if (!phone || !templateName) {
      return NextResponse.json({ error: 'Missing required fields: phone, templateName' }, { status: 400 })
    }

    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (!config) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 })
    }

    const { data: template } = await supabase
      .from('message_templates')
      .select('*')
      .eq('name', templateName)
      .eq('status', 'APPROVED')
      .single()

    if (!template) {
      return NextResponse.json({ error: `Template "${templateName}" not found or not approved` }, { status: 404 })
    }

    const accessToken = decryptToken(config.access_token)
    const to = formatPhoneE164(phone)

    const components = buildTemplateComponents(template.body_text, {
      body: bodyParams || [],
      headerText,
      headerMediaUrl,
      buttonParams
    })

    const result = await sendTemplateMessage(
      { phoneNumberId: config.phone_number_id, accessToken },
      { to, templateName, language: template.language || 'en_US', components }
    )

    if (result.success) {
      await supabase.from('notification_log').insert({
        customer_phone: to,
        template_name: templateName,
        template_params: { body: bodyParams },
        whatsapp_message_id: result.messageId,
        status: 'sent'
      })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('WhatsApp send error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
