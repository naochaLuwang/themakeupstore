import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdfkikpoalylyufuprki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZmtpa3BvYWx5bHl1ZnVwcmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIwODc4MywiZXhwIjoyMDgzNzg0NzgzfQ.xP53WFqY_11Ys_6LXfMc6fgZMFDu5PerXswxa_fPzbA'

const supabase = createClient(supabaseUrl, supabaseKey)

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
        return { salePrice: minSale, mrp: minMrp, discountPercentage: bestDiscPct, discountAmount: bestDiscAmount, hasDiscount: hasDisc, variantCount: variants.length }
    }
    const base = product.base_price || 0
    const mrpVal = product.mrp || base
    const dType = product.discount_type || "none"
    const dVal = Number(product.discount_value || 0)
    let sale = base
    if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
    else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
    const discountAmount = Math.max(0, mrpVal - sale)
    return { salePrice: sale, mrp: mrpVal, discountPercentage: mrpVal > 0 ? Math.round((discountAmount / mrpVal) * 100) : 0, discountAmount, hasDiscount: discountAmount > 0, variantCount: 0 }
}

async function main() {
    const { data, error } = await supabase
        .from('products')
        .select(`
            id, name, base_price, discount_type, discount_value, has_variants,
            product_variants(id, price, discount_type, discount_value, mrp)
        `)
        .eq('status', 'active')
        .order('name')
        .limit(200)

    if (error) { console.error('Query error:', error); return }

    let issues: any[] = []

    for (const p of data || []) {
        const result = computePricing(p)
        const hasAnyVarDisc = (p.product_variants || []).some((v: any) => {
            const dType = v.discount_type || p.discount_type || "none"
            const dVal = Number(v.discount_value || p.discount_value || 0)
            return dType !== "none" && dVal > 0
        })
        const hasProdDisc = p.discount_type !== "none" && Number(p.discount_value) > 0

        // Find variants where discount should apply
        const varDetails = (p.product_variants || []).map((v: any) => {
            const base = Number(v.price) || 0
            const mrpVal = Number(v.mrp || base)
            const dType = v.discount_type || p.discount_type || "none"
            const dVal = Number(v.discount_value || p.discount_value || 0)
            let sale = base
            if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
            else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
            return { price: base, mrp: mrpVal, dType, dVal, sale, discAmt: Math.max(0, mrpVal - sale) }
        })

        if (hasAnyVarDisc && !result.hasDiscount) {
            issues.push({ name: p.name, id: p.id, hasProdDisc, hasAnyVarDisc, result, varDetails })
        }
        // Also catch: has product-level discount but variants empty or missing
        if (hasProdDisc && !hasAnyVarDisc && !result.hasDiscount && (p.product_variants || []).length === 0) {
            issues.push({ name: p.name, id: p.id, hasProdDisc, hasAnyVarDisc, result, varDetails, note: "product-level disc but no variants" })
        }
        // Catch: has product-level discount, has variants, but variants override or nullify
        if (hasProdDisc && (p.product_variants || []).length > 0) {
            const allVariantsNoDisc = (p.product_variants || []).every((v: any) => {
                const dType = v.discount_type || p.discount_type || "none"
                const dVal = Number(v.discount_value || p.discount_value || 0)
                return dType === "none" || dVal <= 0
            })
            if (allVariantsNoDisc && !result.hasDiscount) {
                issues.push({ name: p.name, id: p.id, hasProdDisc, hasAnyVarDisc, result, varDetails, note: "prod disc but all variants override to none" })
            }
        }
    }

    if (issues.length === 0) {
        console.log('No issues found — all discount scenarios compute correctly.')
    } else {
        console.log(`Found ${issues.length} products with discount discrepancies:\n`)
        for (const issue of issues) {
            console.log(`=== ${issue.name} ===`)
            console.log(`  hasProdDisc=${issue.hasProdDisc} hasAnyVarDisc=${issue.hasAnyVarDisc} result.hasDiscount=${issue.result.hasDiscount}`)
            console.log(`  result: sale=${issue.result.salePrice} mrp=${issue.result.mrp} discPct=${issue.result.discountPercentage} discAmt=${issue.result.discountAmount}`)
            if (issue.note) console.log(`  note: ${issue.note}`)
            for (const vd of issue.varDetails) {
                console.log(`  variant: price=${vd.price} mrp=${vd.mrp} dType="${vd.dType}" dVal=${vd.dVal} sale=${vd.sale} discAmt=${vd.discAmt}`)
            }
            console.log()
        }
    }
}

main().catch(console.error)
