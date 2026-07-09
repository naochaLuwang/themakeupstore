import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // Count null SKUs
  const { count: nullCount, error: err1 } = await supabase
    .from('product_variants')
    .select('*', { count: 'exact', head: true })
    .is('sku', null)
  console.log('Null SKUs:', nullCount, err1)

  // Count total
  const { count: total, error: err2 } = await supabase
    .from('product_variants')
    .select('*', { count: 'exact', head: true })
  console.log('Total:', total, err2)

  // Try inserting a duplicate SKU to check UNIQUE constraint
  const first = await supabase
    .from('product_variants')
    .select('sku')
    .limit(1)
    .single()
  console.log('First variant SKU:', first.data?.sku)

  // Try to find any variant with empty or null sku
  const { data: empties, error: err3 } = await supabase
    .from('product_variants')
    .select('id, sku')
    .or('sku.is.null,sku.eq.')
    .limit(5)
  console.log('Empty/null SKUs:', JSON.stringify(empties, null, 2), err3)
}

main().catch(console.error)
