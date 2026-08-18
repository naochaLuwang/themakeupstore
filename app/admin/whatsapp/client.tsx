"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Save, Plus, Trash2, MessageSquare, CheckCircle2, Clock, XCircle } from "lucide-react"

interface Template {
  id: string
  name: string
  category: string
  language: string
  header_type: string | null
  header_content: string | null
  body_text: string
  footer_text: string | null
  status: string
  meta_template_id: string | null
  created_at: string
}

interface Log {
  id: string
  order_id: string | null
  customer_phone: string
  template_name: string
  template_params: any
  whatsapp_message_id: string | null
  status: string
  error_message: string | null
  created_at: string
}

interface Config {
  phone_number_id: string
  waba_id: string
  business_account_id: string
  access_token: string
  verify_token: string
  webhook_secret: string
}

export function WhatsAppClient({
  initialConfig,
  initialTemplates,
  initialLogs
}: {
  initialConfig: Config | null
  initialTemplates: Template[]
  initialLogs: Log[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'config' | 'templates' | 'logs'>('config')
  const [config, setConfig] = useState<Config>(
    initialConfig || {
      phone_number_id: '',
      waba_id: '',
      business_account_id: '',
      access_token: '',
      verify_token: '',
      webhook_secret: ''
    }
  )
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [logs] = useState<Log[]>(initialLogs)
  const [saving, setSaving] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [editTemplate, setEditTemplate] = useState<Template | null>(null)
  const [tf, setTf] = useState({
    name: '',
    category: 'UTILITY',
    language: 'en_US',
    header_type: '',
    header_content: '',
    body_text: '',
    footer_text: '',
    status: 'APPROVED',
    meta_template_id: ''
  })

  const saveConfig = async () => {
    setSaving(true)
    const fd = new FormData()
    fd.set('phone_number_id', config.phone_number_id)
    fd.set('waba_id', config.waba_id)
    fd.set('business_account_id', config.business_account_id)
    fd.set('access_token', config.access_token)
    fd.set('verify_token', config.verify_token)
    fd.set('webhook_secret', config.webhook_secret)
    const res = await fetch('/api/admin/whatsapp/config', { method: 'POST', body: fd })
    const data = await res.json()
    setSaving(false)
    if (data.success) router.refresh()
  }

  const saveTemplate = async () => {
    setSaving(true)
    const fd = new FormData()
    if (editTemplate) fd.set('id', editTemplate.id)
    fd.set('name', tf.name)
    fd.set('category', tf.category)
    fd.set('language', tf.language)
    fd.set('header_type', tf.header_type || '')
    fd.set('header_content', tf.header_content || '')
    fd.set('body_text', tf.body_text)
    fd.set('footer_text', tf.footer_text || '')
    fd.set('status', tf.status)
    fd.set('meta_template_id', tf.meta_template_id || '')
    const res = await fetch('/api/admin/whatsapp/template', { method: 'POST', body: fd })
    const data = await res.json()
    setSaving(false)
    if (data.success) {
      setShowTemplateForm(false)
      setEditTemplate(null)
      router.refresh()
    }
  }

  const deleteTemplate = async (id: string) => {
    const res = await fetch(`/api/admin/whatsapp/template?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setTemplates(templates.filter(t => t.id !== id))
      router.refresh()
    }
  }

  const editTemplateFn = (t: Template) => {
    setEditTemplate(t)
    setTf({
      name: t.name,
      category: t.category,
      language: t.language,
      header_type: t.header_type || '',
      header_content: t.header_content || '',
      body_text: t.body_text,
      footer_text: t.footer_text || '',
      status: t.status,
      meta_template_id: t.meta_template_id || ''
    })
    setShowTemplateForm(true)
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case 'sent': return <CheckCircle2 className="w-3 h-3 text-emerald-500" />
      case 'delivered': return <CheckCircle2 className="w-3 h-3 text-blue-500" />
      case 'read': return <CheckCircle2 className="w-3 h-3 text-violet-500" />
      case 'failed': return <XCircle className="w-3 h-3 text-red-500" />
      default: return <Clock className="w-3 h-3 text-slate-400" />
    }
  }

  return (
    <>
      <div className="flex gap-2 mb-6">
        {(['config', 'templates', 'logs'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t === 'config' ? 'Configuration' : t === 'templates' ? 'Templates' : 'Notification Log'}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number ID *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                value={config.phone_number_id}
                onChange={e => setConfig({ ...config, phone_number_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WABA ID</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                value={config.waba_id}
                onChange={e => setConfig({ ...config, waba_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Account ID</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                value={config.business_account_id}
                onChange={e => setConfig({ ...config, business_account_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Token *</label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                value={config.access_token}
                onChange={e => setConfig({ ...config, access_token: e.target.value })}
                placeholder={initialConfig ? '(unchanged — leave blank to keep)' : ''}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verify Token</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                value={config.verify_token}
                onChange={e => setConfig({ ...config, verify_token: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Webhook Secret (App Secret)</label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                value={config.webhook_secret}
                onChange={e => setConfig({ ...config, webhook_secret: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditTemplate(null); setTf({ name: '', category: 'UTILITY', language: 'en_US', header_type: '', header_content: '', body_text: '', footer_text: '', status: 'APPROVED', meta_template_id: '' }); setShowTemplateForm(true) }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Template
            </button>
          </div>

          {showTemplateForm && (
            <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-700">
                {editTemplate ? 'Edit Template' : 'New Template'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name *</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                    value={tf.name}
                    onChange={e => setTf({ ...tf, name: e.target.value })}
                    placeholder="order_confirmed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                    value={tf.category}
                    onChange={e => setTf({ ...tf, category: e.target.value })}
                  >
                    <option value="UTILITY">UTILITY</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Language</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                    value={tf.language}
                    onChange={e => setTf({ ...tf, language: e.target.value })}
                    placeholder="en_US"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Header Type</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                    value={tf.header_type}
                    onChange={e => setTf({ ...tf, header_type: e.target.value })}
                  >
                    <option value="">None</option>
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                  </select>
                </div>
                {tf.header_type && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Header Content</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                      value={tf.header_content}
                      onChange={e => setTf({ ...tf, header_content: e.target.value })}
                      placeholder={tf.header_type === 'IMAGE' ? 'Image URL' : 'Header text or {{1}}'}
                    />
                  </div>
                )}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Body Template *</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 h-24 resize-none"
                    value={tf.body_text}
                    onChange={e => setTf({ ...tf, body_text: e.target.value })}
                    placeholder="Hi {{1}}, your order #{{2}} is now {{3}}. Items: {{4}}. Track at: {{5}}"
                  />
                  <p className="text-xs text-slate-400">Use {'{{1}}'}, {'{{2}}'}, etc. for variables. <br />For order templates: 1=name, 2=order#, 3=status, 4=items, 5=track URL</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Footer</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                    value={tf.footer_text}
                    onChange={e => setTf({ ...tf, footer_text: e.target.value })}
                    placeholder="Thank you for shopping!"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                    value={tf.status}
                    onChange={e => setTf({ ...tf, status: e.target.value })}
                  >
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meta Template ID</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                    value={tf.meta_template_id}
                    onChange={e => setTf({ ...tf, meta_template_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => { setShowTemplateForm(false); setEditTemplate(null) }}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : editTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Body Preview</th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                      No templates yet. Create one to match your Meta-approved WhatsApp templates.
                    </td>
                  </tr>
                ) : templates.map(t => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-slate-800">{t.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs text-slate-500">{t.category}</span>
                    </td>
                    <td className="py-4 px-6 max-w-[300px]">
                      <span className="text-xs text-slate-500 truncate block">{t.body_text}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                        t.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => editTemplateFn(t)}
                          className="rounded-lg h-9 w-9 border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                        >
                          <MessageSquare className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          className="rounded-lg h-9 w-9 border border-slate-200 flex items-center justify-center hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Template</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                    No notifications sent yet.
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-4 px-6">
                    <span className="text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-bold text-slate-700">
                      {log.order_id ? `#${log.order_id.slice(0, 8)}` : '-'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs text-slate-600">{log.customer_phone}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs text-slate-600">{log.template_name}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(log.status)}
                      <span className="text-xs font-bold text-slate-600 capitalize">{log.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
