import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createRecoveryHandler } from '../_shared/cart-recovery.ts'

serve(createRecoveryHandler({
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SB_SERVICE_ROLE'),
  apiKey: Deno.env.get('RESEND_API_KEY'),
}))
