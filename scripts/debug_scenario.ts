import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    // Find products with multiple variants where:
    // - At least one variant has a discount
    // - At least one variant has no discount  
    const { data, error } = await supabase
        .from('products')
        .select(`
            id, name, discount_type, discount_value,
            product_variants(id, price, discount_type, discount_value)
        `)
        .eq('status', 'active')
        .limit(500)

    if (error) { console.error(error); return }

    let multiVarProducts = 0
    let affected = 0

    for (const p of data || []) {
        const v = p.product_variants || []
        if (v.length < 2) continue
        multiVarProducts++

        const withDisc = v.filter((x: any) => {
            const dt = x.discount_type || p.discount_type || "none"
            const dv = Number(x.discount_value || p.discount_value || 0)
            return dt !== "none" && dv > 0
        })
        const withoutDisc = v.filter((x: any) => {
            const dt = x.discount_type || p.discount_type || "none"
            const dv = Number(x.discount_value || p.discount_value || 0)
            return dt === "none" || dv <= 0
        })

        if (withDisc.length > 0 && withoutDisc.length > 0) {
            // Check which is cheapest
            const cheapest = v.reduce((min: any, x: any) => Number(x.price) < Number(min.price) ? x : min, v[0])
            const cheapestHasDisc = withDisc.some((x: any) => x.id === cheapest.id)

            if (!cheapestHasDisc) {
                affected++
                console.log(`\n=== ${p.name} ===`)
                console.log(`Product disc: ${p.discount_type}/${p.discount_value}`)
                console.log(`Variants: ${v.length} (with disc: ${withDisc.length}, without: ${withoutDisc.length})`)
                console.log(`Cheapest variant (${cheapest.id.slice(0,8)}): price=${cheapest.price} dType=${cheapest.discount_type} dVal=${cheapest.discount_value}`)
                for (const vv of v) {
                    const hasDisc = withDisc.some((x: any) => x.id === vv.id)
                    console.log(`  ${vv.id.slice(0,8)}: price=${vv.price} dType=${vv.discount_type} dVal=${vv.discount_value} ${hasDisc ? '✅ DISCOUNT' : '❌ NO DISC'} ${vv.id === cheapest.id ? '← CHEAPEST' : ''}`)
                }
                
                // Test old vs new logic
                let oldHasDisc = false
                let newHasDisc = false
                let minSale = Infinity
                for (const vv of v) {
                    const base = Number(vv.price) || 0
                    const mrpVal = base
                    const dType = vv.discount_type || p.discount_type || "none"
                    const dVal = Number(vv.discount_value || p.discount_value || 0)
                    let sale = base
                    if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
                    else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
                    const discAmt = Math.max(0, mrpVal - sale)
                    if (discAmt > 0) newHasDisc = true
                    if (sale < minSale) {
                        minSale = sale
                        oldHasDisc = discAmt > 0
                    }
                }
                console.log(`OLD logic: hasDisc=${oldHasDisc} NEW logic: hasDisc=${newHasDisc}`)
                console.log(`This is the bug scenario!`)
            }
        }
    }

    console.log(`\nMulti-variant products: ${multiVarProducts}`)
    console.log(`Products where cheapest variant has no discount but others do: ${affected}`)
}

main().catch(console.error)
