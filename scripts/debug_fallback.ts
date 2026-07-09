import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    // Find products where product has a discount but at least one variant has "none"
    const { data, error } = await supabase
        .from('products')
        .select(`
            id, name, discount_type, discount_value, has_variants,
            product_variants(id, price, discount_type, discount_value)
        `)
        .eq('status', 'active')
        .neq('discount_type', 'none')
        .gt('discount_value', 0)
        .limit(100)

    if (error) { console.error(error); return }

    let count = 0
    for (const p of data || []) {
        const variantsWithNone = (p.product_variants || []).filter((v: any) => 
            v.discount_type === "none" || v.discount_type === null
        )
        const variantsWithDisc = (p.product_variants || []).filter((v: any) => 
            v.discount_type && v.discount_type !== "none" && Number(v.discount_value) > 0
        )

        // Check: does the OR fallback fail?
        for (const v of p.product_variants || []) {
            const oldDType = v.discount_type || p.discount_type || "none"
            const newDType = v.discount_type && v.discount_type !== "none" ? v.discount_type : p.discount_type || "none"
            if (oldDType !== newDType) {
                count++
                console.log(`${p.name}`)
                console.log(`  product: type=${p.discount_type} val=${p.discount_value}`)
                console.log(`  variant: type=${v.discount_type} val=${v.discount_value} price=${v.price}`)
                console.log(`  OLD fallback dType="${oldDType}" — BLOCKS product discount!`)
                console.log(`  NEW fallback dType="${newDType}" — correct`)
                console.log()
                break
            }
        }
    }
    console.log(`Total affected: ${count}`)
}

main().catch(console.error)
