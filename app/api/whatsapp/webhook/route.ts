import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { verifyWebhookSignature } from "@/lib/whatsapp/webhook-verify"
import { decryptToken } from "@/lib/whatsapp/encryption"

async function loadConfig() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('is_active', true)
    .single()
  return data
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')
  const token = req.nextUrl.searchParams.get('hub.verify_token')

  if (!mode || !token) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const config = await loadConfig()

  if (!config || token !== config.verify_token) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(challenge, { status: 200 })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  const config = await loadConfig()

  if (!config) {
    return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 })
  }

  if (config.webhook_secret) {
    const valid = verifyWebhookSignature(rawBody, signature, config.webhook_secret)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const supabase = await createClient()

  try {
    const event = JSON.parse(rawBody)

    if (event.entry) {
      for (const entry of event.entry) {
        for (const change of entry.changes || []) {
          const value = change.value

          if (change.field === 'messages') {
            const statuses = value.statuses
            if (statuses) {
              for (const status of statuses) {
                const messageId = status.id
                const statusName = status.status
                if (messageId) {
                  await supabase
                    .from('notification_log')
                    .update({ status: statusName })
                    .eq('whatsapp_message_id', messageId)
                }
              }
            }

            const messages = value.messages
            if (messages) {
              for (const msg of messages) {
                const from = msg.from
                const msgType = msg.type
                const text = msg.text?.body || msg.type

                await supabase.from('notification_log').insert({
                  customer_phone: from,
                  template_name: 'inbound_' + (msgType || 'unknown'),
                  template_params: { text, message_id: msg.id },
                  whatsapp_message_id: msg.id,
                  status: 'received'
                })
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('WhatsApp webhook error:', err)
    return NextResponse.json({ success: true })
  }
}
