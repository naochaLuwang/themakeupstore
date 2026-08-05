import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { encryptToken } from "@/lib/whatsapp/encryption"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const fd = await req.formData()
    const phoneNumberId = fd.get('phone_number_id') as string
    const accessToken = fd.get('access_token') as string
    const wabaId = fd.get('waba_id') as string
    const businessAccountId = fd.get('business_account_id') as string
    const verifyToken = fd.get('verify_token') as string
    const webhookSecret = fd.get('webhook_secret') as string

    if (!phoneNumberId) {
      return NextResponse.json({ success: false, error: 'Phone Number ID required' }, { status: 400 })
    }

    const updateData: any = {
      phone_number_id: phoneNumberId,
      waba_id: wabaId || null,
      business_account_id: businessAccountId || null,
      verify_token: verifyToken || '',
      webhook_secret: webhookSecret || '',
      is_active: true,
      updated_at: new Date().toISOString()
    }

    if (accessToken) {
      updateData.access_token = encryptToken(accessToken)
    }

    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id')
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase.from('whatsapp_config').update(updateData).eq('id', existing[0].id)
    } else {
      if (!accessToken) {
        return NextResponse.json({ success: false, error: 'Access Token required for initial setup' }, { status: 400 })
      }
      updateData.access_token = encryptToken(accessToken)
      await supabase.from('whatsapp_config').insert(updateData)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('WhatsApp config save error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
