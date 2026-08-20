import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date().toISOString()
    let results = { started: 0, ended: 0, errors: [] as string[] }

    // Auto-start flash sales that have reached their start time
    const { data: toStart, error: startError } = await supabase
      .from('flash_sales')
      .select('id')
      .eq('is_active', false)
      .lte('starts_at', now)
      .gt('ends_at', now)

    if (startError) {
      results.errors.push(`start query: ${startError.message}`)
    } else if (toStart && toStart.length > 0) {
      const ids = toStart.map(s => s.id)
      const { error: updateStartError } = await supabase
        .from('flash_sales')
        .update({ is_active: true, updated_at: now })
        .in('id', ids)
      
      if (updateStartError) {
        results.errors.push(`start update: ${updateStartError.message}`)
      } else {
        results.started = ids.length
      }
    }

    // Auto-end flash sales that have passed their end time
    const { data: toEnd, error: endError } = await supabase
      .from('flash_sales')
      .select('id')
      .eq('is_active', true)
      .lte('ends_at', now)

    if (endError) {
      results.errors.push(`end query: ${endError.message}`)
    } else if (toEnd && toEnd.length > 0) {
      const ids = toEnd.map(s => s.id)
      const { error: updateEndError } = await supabase
        .from('flash_sales')
        .update({ is_active: false, updated_at: now })
        .in('id', ids)
      
      if (updateEndError) {
        results.errors.push(`end update: ${updateEndError.message}`)
      } else {
        results.ended = ids.length
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})