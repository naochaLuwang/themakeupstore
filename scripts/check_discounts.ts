import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, discount_type, discount_value, has_variants,
      product_variants(id, price, discount_type, discount_value)
    `)
    .or('discount_type.neq.none,discount_value.gt.0')
    .eq('status', 'active')
    .limit(30)

  if (error) { console.error(error); return }

  console.log('Products with product-level discounts:')
  for (const p of data || []) {
    const hasProdDisc = p.discount_type !== 'none' && p.discount_type !== null && Number(p.discount_value) > 0
    const varDiscs = (p.product_variants || []).filter((v: any) => v.discount_type !== 'none' && v.discount_type !== null && Number(v.discount_value) > 0)
    console.log(`\n${p.name}`)
    console.log(`  product: type=${p.discount_type} value=${p.discount_value} hasDisc=${hasProdDisc}`)
    console.log(`  variants with disc: ${varDiscs.length}/${(p.product_variants || []).length}`)
    for (const v of p.product_variants || []) {
      if (v.discount_type !== 'none' && v.discount_type !== null && Number(v.discount_value) > 0) {
        console.log(`    variant ${v.id.slice(0,8)}: price=${v.price} type=${v.discount_type} value=${v.discount_value}`)
      }
    }
  }

  // Also find products where variant has discount but product does not
  const { data: varOnly } = await supabase
    .from('product_variants')
    .select(`id, price, discount_type, discount_value, product_id, products!inner(id, name, discount_type, discount_value)`)
    .not('discount_type', 'eq', 'none')
    .gt('discount_value', 0)
    .limit(20)

  console.log('\n\nVariants with discounts where product has none:')
  for (const v of varOnly || []) {
    const prod: any = (v as any).products
    if (!prod.discount_type || prod.discount_type === 'none' || Number(prod.discount_value) <= 0) {
      console.log(`  ${prod.name}: v_disc=${v.discount_type}/${v.discount_value} prod_disc=${prod.discount_type}/${prod.discount_value}`)
    }
  }
}

main().catch(console.error)
