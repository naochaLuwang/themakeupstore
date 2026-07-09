import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    // Get count of products with product-level discount
    const { count: prodWithDisc } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .neq('discount_type', 'none')
        .gt('discount_value', 0)
    console.log(`Products with product-level discount: ${prodWithDisc}`)

    // Get ALL of them (no limit)
    const { data: prods } = await supabase
        .from('products')
        .select(`id, name, discount_type, discount_value, product_variants(id, discount_type, discount_value)`)
        .eq('status', 'active')
        .neq('discount_type', 'none')
        .gt('discount_value', 0)

    if (!prods) { console.log('No data'); return }
    console.log(`Fetched ${prods.length} products\n`)

    let blockingCount = 0
    for (const p of prods) {
        for (const v of p.product_variants || []) {
            // The bug: v.discount_type = "none" is truthy, so || short-circuits and product discount is lost
            const oldDType = v.discount_type || p.discount_type || "none"
            const newDType = v.discount_type && v.discount_type !== "none" ? v.discount_type : p.discount_type || "none"
            
            if (oldDType !== newDType) {
                blockingCount++
                console.log(`BLOCKED: ${p.name}`)
                console.log(`  product: ${p.discount_type}=${p.discount_value}`)
                console.log(`  variant: ${v.discount_type}=${v.discount_value}`)
                console.log(`  OLD dType="${oldDType}" NEW dType="${newDType}"`)
                console.log()
                break // one per product
            }
        }
    }

    console.log(`\nTotal products where variant "none" blocks product discount: ${blockingCount}`)

    // Also check: products where variant has discount_type='none' explicitly (set by admin form)
    const { data: varNone } = await supabase
        .from('product_variants')
        .select('discount_type, products!inner(id, name, discount_type, discount_value)')
        .eq('discount_type', 'none')
        .limit(20)

    if (varNone) {
        console.log(`\nSample variants with explicit discount_type='none':`)
        for (const v of varNone) {
            const p = (v as any).products
            console.log(`  ${p.name}: variant type="${v.discount_type}" val=${(v as any).discount_value} | prod type="${p.discount_type}" val=${p.discount_value}`)
        }
    }
}

main().catch(console.error)
