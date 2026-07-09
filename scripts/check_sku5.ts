import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Accept': 'application/openapi+json'
    }
  })
  
  const apiDoc = await response.json()
  const def = apiDoc.definitions?.product_variants
  if (def) {
    console.log('Definition:', JSON.stringify(def, null, 2))
  }
}

main().catch(console.error)
