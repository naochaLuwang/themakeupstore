import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // Check if sku column allows nulls by counting null skus
  const { data: nullSkus, error: err1 } = await supabase
    .from('product_variants')
    .select('id', { count: 'exact', head: true })
    .is('sku', null)
  console.log('Null SKUs count:', nullSkus, err1)

  // Check total count
  const { count: total, error: err2 } = await supabase
    .from('product_variants')
    .select('id', { count: 'exact', head: true })
  console.log('Total variants:', total, err2)

  // Check for duplicate SKUs
  const { data: duplicates, error: err3 } = await supabase
    .rpc('check_duplicate_skus' as any)
  console.log('Duplicates check:', duplicates, err3)

  // Just sample some data to see what sku values look like
  const { data: sample, error: err4 } = await supabase
    .from('product_variants')
    .select('id, sku')
    .limit(10)
  console.log('Sample:', JSON.stringify(sample, null, 2), err4)
}

main().catch(console.error)
