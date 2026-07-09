import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'product_variants' AND column_name = 'sku' AND table_schema = 'public'
    `
  })
  console.log(JSON.stringify({ data, error }, null, 2))
}

main().catch(console.error)
