import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  try {
    // Try to query constraint info via the raw table endpoint
    // PostgREST doesn't expose information_schema by default, but we can try
    
    // Alternative: use Supabase's built-in schema cache via the OpenAPI/Swagger
    // Let's try to get info by looking at what happens when we do a POST with null sku
    // Actually, let's just check by counting duplicates (which would violate UNIQUE)
    
    // Check for duplicate SKUs by doing a raw group by query
    const { data: dupes, error: err1 } = await supabase
      .from('product_variants')
      .select('sku, count')
      .not('sku', 'is', null)
    
    // Actually, supabase-js doesn't support GROUP BY directly
    // Let me try a different approach
    
    // Check the raw API response for table info
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/openapi+json'
      }
    })
    
    if (response.ok) {
      const apiDoc = await response.json()
      // Look for product_variants in the paths
      const paths = Object.keys(apiDoc.paths || {})
      const prodVarPath = paths.find(p => p.includes('product_variants'))
      if (prodVarPath) {
        const schema = apiDoc.paths[prodVarPath]
        console.log('Schema:', JSON.stringify(schema, null, 2).slice(0, 2000))
      } else {
        console.log('No product_variants path found')
        console.log('Paths:', paths.slice(0, 20))
      }
    } else {
      console.log('Failed to get API doc:', response.status, await response.text())
    }
  } catch (err) {
    console.error(err)
  }
}

main().catch(console.error)
