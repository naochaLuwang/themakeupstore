const GRAPH_API = 'https://graph.facebook.com/v21.0'

export interface MetaApiOptions {
  phoneNumberId: string
  accessToken: string
}

export interface TemplateMessageParams {
  to: string
  templateName: string
  language: string
  components: any[]
}

export async function sendTemplateMessage(
  config: MetaApiOptions,
  params: TemplateMessageParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const body: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: params.to,
    type: 'template',
    template: {
      name: params.templateName,
      language: { code: params.language },
      components: params.components
    }
  }

  const res = await fetch(
    `${GRAPH_API}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.accessToken}`
      },
      body: JSON.stringify(body)
    }
  )

  const data = await res.json()

  if (!res.ok) {
    const errMsg = data?.error?.message || data?.error?.error_user_msg || 'Unknown Meta API error'
    console.error('WhatsApp sendTemplateMessage failed:', JSON.stringify(data))
    return { success: false, error: errMsg }
  }

  return { success: true, messageId: data?.messages?.[0]?.id }
}

export async function sendTextMessage(
  config: MetaApiOptions,
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: true, body: text }
  }

  const res = await fetch(
    `${GRAPH_API}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.accessToken}`
      },
      body: JSON.stringify(body)
    }
  )

  const data = await res.json()

  if (!res.ok) {
    const errMsg = data?.error?.message || 'Unknown Meta API error'
    console.error('WhatsApp sendTextMessage failed:', JSON.stringify(data))
    return { success: false, error: errMsg }
  }

  return { success: true, messageId: data?.messages?.[0]?.id }
}

export async function subscribeToWebhook(
  accessToken: string,
  wabaId: string
): Promise<boolean> {
  const res = await fetch(
    `${GRAPH_API}/${wabaId}/subscribed_apps`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  )
  return res.ok
}

export async function registerPhoneNumber(
  accessToken: string,
  phoneNumberId: string,
  pin: string
): Promise<boolean> {
  const res = await fetch(
    `${GRAPH_API}/${phoneNumberId}/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin
      })
    }
  )
  return res.ok
}

export async function fetchTemplateList(
  config: MetaApiOptions,
  wabaId: string
): Promise<{ name: string; id: string; status: string; body: string }[]> {
  const res = await fetch(
    `${GRAPH_API}/${wabaId}/message_templates`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    }
  )

  if (!res.ok) return []

  const data = await res.json()
  return (data?.data || []).map((t: any) => ({
    name: t.name,
    id: t.id,
    status: t.status,
    body: t.components?.find((c: any) => c.type === 'BODY')?.text || ''
  }))
}
