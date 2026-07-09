import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

// Exact query from the store page
async function main() {
    const prodRes = await supabase
        .from("products")
        .select(`
            id, name, slug, base_price, thumbnail_url, brand, discount_type, discount_value, has_variants, status,
            product_variants(id, price, stock, hex_code, discount_type, discount_value, title, image_url)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50)

    const products = prodRes.data || []
    console.log(`Total products fetched: ${products.length}\n`)

    // Process like the store page
    const inStockProducts = products.filter((p: any) => {
        const variants = p.product_variants || []
        return variants.length === 0 || variants.some((v: any) => Number(v.stock) > 0)
    }).slice(0, 12)

    console.log("=== In-stock products shown on homepage (first 12) ===\n")

    for (const p of inStockProducts) {
        const variants = p.product_variants || []
        const pricing = computePricing(p)
        
        const hasAnyVarDisc = variants.some((v: any) => {
            const dt = v.discount_type || p.discount_type || "none"
            const dv = Number(v.discount_value || p.discount_value || 0)
            return dt !== "none" && dv > 0
        })
        const hasProdDisc = p.discount_type && p.discount_type !== "none" && Number(p.discount_value) > 0

        console.log(`${p.name}`)
        console.log(`  brand=${p.brand} has_variants=${p.has_variants} variants_count=${variants.length}`)
        console.log(`  prod disc: type="${p.discount_type}" val=${p.discount_value}`)
        console.log(`  hasAnyVarDisc=${hasAnyVarDisc} hasProdDisc=${hasProdDisc} computed.hasDiscount=${pricing.hasDiscount}`)
        console.log(`  result: sale=${pricing.salePrice} mrp=${pricing.mrp} pct=${pricing.discountPercentage} amt=${pricing.discountAmount}`)
        
        // Detail each variant
        for (const v of variants) {
            const base = Number(v.price) || 0
            const dt = v.discount_type || p.discount_type || "none"
            const dv = Number(v.discount_value || p.discount_value || 0)
            let sale = base
            if (dt === "percentage" && dv > 0) sale = base - base * (dv / 100)
            else if ((dt === "fixed" || dt === "amount") && dv > 0) sale = Math.max(0, base - dv)
            console.log(`  variant ${v.id.slice(0,8)}: price=${v.price} dType="${v.discount_type}" dVal=${v.discount_value} | fallback dType="${dt}" dVal=${dv} | sale=${sale} discAmt=${Math.max(0, base - sale)}`)
        }
        
        if (!pricing.hasDiscount && (hasAnyVarDisc || hasProdDisc)) {
            console.log(`  ❌ MISMATCH: should have badge but compute says no!`)
        }
        console.log()
    }
}

function computePricing(product: any) {
    const variants = product.product_variants || []
    if (variants.length > 0) {
        let minSale = Infinity
        let minMrp = Infinity
        let bestDiscPct = 0
        let bestDiscAmount = 0
        let hasDisc = false
        for (const v of variants) {
            const base = Number(v.price) || 0
            const mrpVal = Number(v.mrp || base)
            const dType = v.discount_type || product.discount_type || "none"
            const dVal = Number(v.discount_value || product.discount_value || 0)
            let sale = base
            if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
            else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
            const discAmt = Math.max(0, mrpVal - sale)
            if (discAmt > 0) hasDisc = true
            if (sale < minSale) { minSale = sale; minMrp = mrpVal }
            if (discAmt > bestDiscAmount) {
                bestDiscAmount = discAmt
                bestDiscPct = dType !== "none" && dVal > 0 ? (dType === "percentage" ? dVal : (mrpVal > 0 ? Math.round((discAmt / mrpVal) * 100) : 0)) : 0
            }
        }
        return { salePrice: minSale, mrp: minMrp, discountPercentage: bestDiscPct, discountAmount: bestDiscAmount, hasDiscount: hasDisc }
    }
    const base = product.base_price || 0
    const mrpVal = product.mrp || base
    const dType = product.discount_type || "none"
    const dVal = Number(product.discount_value || 0)
    let sale = base
    if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
    else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
    const discountAmount = Math.max(0, mrpVal - sale)
    return { salePrice: sale, mrp: mrpVal, discountPercentage: mrpVal > 0 ? Math.round((discountAmount / mrpVal) * 100) : 0, discountAmount, hasDiscount: discountAmount > 0 }
}

main().catch(console.error)
