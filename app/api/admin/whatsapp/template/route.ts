import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

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
    const id = fd.get('id') as string
    const name = fd.get('name') as string
    const bodyText = fd.get('body_text') as string

    if (!name || !bodyText) {
      return NextResponse.json({ success: false, error: 'Name and body text required' }, { status: 400 })
    }

    const payload: any = {
      name: name.trim(),
      category: (fd.get('category') as string) || 'UTILITY',
      language: (fd.get('language') as string) || 'en_US',
      header_type: (fd.get('header_type') as string) || null,
      header_content: (fd.get('header_content') as string) || null,
      body_text: bodyText.trim(),
      footer_text: (fd.get('footer_text') as string) || null,
      status: (fd.get('status') as string) || 'APPROVED',
      meta_template_id: (fd.get('meta_template_id') as string) || null,
      updated_at: new Date().toISOString()
    }

    if (id) {
      await supabase.from('message_templates').update(payload).eq('id', id)
    } else {
      await supabase.from('message_templates').insert(payload)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
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

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await supabase.from('message_templates').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
