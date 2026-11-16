import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendCartRecoveryEmail } from '../_shared/cart-recovery.ts'

type Candidate = {
  id: string; user_id: string; updated_at: string; profiles: { full_name: string | null };
  cart_items: { quantity: number; products: { name: string } | null }[];
}

serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) return new Response('Scheduler is not configured', { status: 503 })
  if (request.headers.get('x-cron-secret') !== cronSecret) return new Response('Unauthorized', { status: 401 })
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const url = Deno.env.get('SB_URL') || Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SB_SERVICE_ROLE') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!apiKey || !url || !serviceKey) return new Response('Scheduler is not configured', { status: 503 })
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const cutoff = new Date(Date.now() - 3_600_000).toISOString()
    const { data: directory, error: directoryError } = await client.rpc('admin_cart_recovery_directory', {
      p_status: 'pending', p_page_size: 25, p_recoverable_only: true,
    })
    if (directoryError) return new Response('Unable to read abandoned carts', { status: 500 })
    const ids = (directory.carts as { id: string }[]).map(cart => cart.id)
    if (!ids.length) return Response.json({ sent: 0, failed: 0, skipped: 0, unconfirmed: 0 })
    const { data, error } = await client.from('carts').select(`
      id,user_id,updated_at,profiles!inner(full_name,deleted_at),cart_items!inner(quantity,products(name))
    `).in('id', ids).lt('updated_at', cutoff).is('abandoned_email_sent_at', null).is('profiles.deleted_at', null)
      .gt('cart_items.quantity', 0).order('updated_at', { ascending: true }).order('id').limit(25)
    if (error) return new Response('Unable to read abandoned carts', { status: 500 })
    let sent = 0, failed = 0, skipped = 0, unconfirmed = 0
    for (const cart of (data || []) as unknown as Candidate[]) {
      let attempted = false
      try {
        const { data: contact, error: contactError } = await client.auth.admin.getUserById(cart.user_id)
        if (contactError || !contact.user?.email) { skipped++; continue }
        const { data: current, error: currentError } = await client.from('carts').select('id,cart_items!inner(quantity)')
          .eq('id', cart.id).eq('updated_at', cart.updated_at).is('abandoned_email_sent_at', null)
          .lt('updated_at', cutoff).gt('cart_items.quantity', 0).maybeSingle()
        if (currentError) { failed++; continue }
        if (!current) { skipped++; continue }
        attempted = true
        const response = await sendCartRecoveryEmail({
          email: contact.user.email, userName: cart.profiles.full_name || 'there',
          itemCount: cart.cart_items.reduce((sum, item) => sum + item.quantity, 0),
          itemNames: cart.cart_items.map(item => item.products?.name).filter(Boolean).sort().join(', '),
          recoveryKey: `cart-recovery/${cart.id}`,
        }, apiKey)
        if (!response.ok) { if (response.status >= 500) unconfirmed++; else failed++; continue }
        const { data: marked, error: markError } = await client.from('carts')
          .update({ abandoned_email_sent_at: new Date().toISOString() }).eq('id', cart.id)
          .eq('updated_at', cart.updated_at).is('abandoned_email_sent_at', null).select('id')
        if (markError || !marked?.length) unconfirmed++
        else sent++
      } catch { if (attempted) unconfirmed++; else failed++ }
    }
    return Response.json({ sent, failed, skipped, unconfirmed })
  } catch {
    return new Response('Recovery run could not be confirmed', { status: 503 })
  }
})
