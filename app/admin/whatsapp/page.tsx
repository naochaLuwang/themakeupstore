import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { WhatsAppClient } from "./client"

export default async function AdminWhatsAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('*')
    .limit(1)
    .maybeSingle()

  const { data: templates } = await supabase
    .from('message_templates')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: logs } = await supabase
    .from('notification_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://themakeupstorewangkhei.com'
  const webhookUrl = `${siteUrl}/api/whatsapp/webhook`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">WhatsApp Integration</h1>
        <p className="text-sm text-slate-500">Configure WhatsApp Business API for order notifications</p>
      </div>

      {config && (
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Webhook URL</h2>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs text-slate-500 mb-2">Set this as the webhook callback URL in your Meta Business App:</p>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 select-all">{webhookUrl}</code>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {config.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Verify token: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{config.verify_token || '(not set)'}</code>
            </p>
          </div>
        </div>
      )}

      <WhatsAppClient
        initialConfig={config ? {
          phone_number_id: config.phone_number_id,
          waba_id: config.waba_id || '',
          business_account_id: config.business_account_id || '',
          access_token: '',
          verify_token: config.verify_token || '',
          webhook_secret: config.webhook_secret || ''
        } : null}
        initialTemplates={templates || []}
        initialLogs={logs || []}
      />
    </div>
  )
}
