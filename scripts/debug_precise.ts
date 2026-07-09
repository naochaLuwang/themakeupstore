import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

function oldComputePricing(product: any) {
    const variants = product.product_variants || []
    if (variants.length > 0) {
        let minSale = Infinity, minMrp = Infinity, minDiscount = 0, minDiscountAmount = 0, hasDisc = false
        for (const v of variants) {
            const base = Number(v.price) || 0
            const mrpVal = Number(v.mrp || base)
            const dType = v.discount_type || product.discount_type || "none"
            const dVal = Number(v.discount_value || product.discount_value || 0)
            let sale = base
            if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
            else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
            if (sale < minSale) {
                minSale = sale; minMrp = mrpVal
                minDiscount = dType !== "none" && dVal > 0 ? (dType === "percentage" ? dVal : Math.round(((mrpVal - sale) / mrpVal) * 100)) : 0
                minDiscountAmount = Math.max(0, mrpVal - sale)
                hasDisc = minDiscountAmount > 0
            }
        }
        return { hasDiscount: hasDisc }
    }
    const base = product.base_price || 0
    const mrpVal = product.mrp || base
    const dType = product.discount_type || "none"
    const dVal = Number(product.discount_value || 0)
    let sale = base
    if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
    else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
    const discountAmount = Math.max(0, mrpVal - sale)
    return { hasDiscount: discountAmount > 0 }
}

async function main() {
    // Exact store query
    const { data: storeProds } = await supabase
        .from("products")
        .select(`id, name, discount_type, discount_value, has_variants, brand,
            product_variants(id, price, stock, discount_type, discount_value)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50)

    console.log("Store query (top 50 newest active products):")
    console.log("Checking ALL products (not just in-stock)\n")

    for (const p of storeProds || []) {
        const variants = p.product_variants || []
        const hasVar = p.has_variants && variants.length > 0
        const oldResult = oldComputePricing(p)
        
        // Is there any variant with a discount?
        const anyVarDisc = variants.some((v: any) => {
            const dt = v.discount_type || p.discount_type || "none"
            const dv = Number(v.discount_value || p.discount_value || 0)
            return dt !== "none" && dv > 0
        })
        const prodDisc = p.discount_type !== "none" && Number(p.discount_value) > 0

        const shouldShowBadge = anyVarDisc || prodDisc
        const willShow = oldResult.hasDiscount

        if (hasVar && shouldShowBadge && !willShow) {
            console.log(`❌ ${p.name} (has_variants=${p.has_variants}, ${variants.length} variants)`)
            console.log(`   prod disc: ${p.discount_type}/${p.discount_value}`)
            for (const v of variants) {
                console.log(`   variant price=${v.price} dType=${v.discount_type} dVal=${v.discount_value} stock=${v.stock}`)
            }
            console.log()
        }
    }

    // Also check: ALL variants with discount where product-level is none
    const { data: varDiscProds } = await supabase
        .from('product_variants')
        .select(`id, price, discount_type, discount_value, product_id, 
            products!inner(id, name, discount_type, discount_value, has_variants)`)
        .not('discount_type', 'eq', 'none')
        .gt('discount_value', 0)
        .limit(200)

    console.log(`\nTotal variants with active discount: ${varDiscProds?.length || 0}`)

    // Now simulate ProductCard rendering for each
    const grouped: Record<string, any> = {}
    for (const v of varDiscProds || []) {
        const p = (v as any).products
        if (!grouped[p.id]) {
            grouped[p.id] = { ...p, product_variants: [] }
        }
        grouped[p.id].product_variants.push(v)
    }

    let prodWithVarIssue = 0
    for (const [id, prod] of Object.entries(grouped)) {
        const p = prod as any
        const variants = p.product_variants || []
        if (!(p.has_variants && variants.length > 0)) continue

        const oldResult = oldComputePricing(p)
        if (!oldResult.hasDiscount) {
            prodWithVarIssue++
            console.log(`\n❌ OLD compute says NO badge for variant product WITH discounts:`)
            console.log(`   ${p.name}`)
            console.log(`   prod disc: ${p.discount_type}/${p.discount_value}`)
            for (const v of variants) {
                console.log(`   var: price=${v.price} dType=${v.discount_type} dVal=${v.discount_value}`)
            }
        }
    }
    console.log(`\nVariant products with discount where old compute fails: ${prodWithVarIssue}`)
}

main().catch(console.error)
