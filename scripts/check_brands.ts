import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase
    .from('products')
    .select('brand')
    .eq('status', 'active')
    .not('brand', 'is', null)
    .neq('brand', '')
    .order('brand')
    .limit(200)

  if (error) {
    console.error('Error:', error)
    return
  }

  const brands = [...new Set(data.map((r: any) => r.brand))]
  console.log('Brands count:', brands.length)
  brands.forEach(b => console.log(`  - ${b}`))
}

main().catch(console.error)
