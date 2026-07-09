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
            product_variants(id, price, discount_type, discount_value)
        `)
        .eq('status', 'active')
        .order('name')
        .limit(200)

    if (error) { console.error('Query error:', error); return }

    let issues: any[] = []
    let shouldHaveBadge = 0
    let hasBadge = 0

    for (const p of data || []) {
        const hasAnyVarDisc = (p.product_variants || []).some((v: any) => {
            const dType = v.discount_type || p.discount_type || "none"
            const dVal = Number(v.discount_value || p.discount_value || 0)
            return dType !== "none" && dVal > 0
        })
        const hasProdDisc = p.discount_type && p.discount_type !== "none" && Number(p.discount_value) > 0

        const result = computePricing(p)

        if (hasAnyVarDisc || hasProdDisc) shouldHaveBadge++
        if (result.hasDiscount) hasBadge++

        // Find cases where it SHOULD have a badge but computePricing says no
        if ((hasAnyVarDisc || hasProdDisc) && !result.hasDiscount) {
            const varDetails = (p.product_variants || []).map((v: any) => {
                const base = Number(v.price) || 0
                const mrpVal = base // no mrp column
                const dType = v.discount_type || p.discount_type || "none"
                const dVal = Number(v.discount_value || p.discount_value || 0)
                let sale = base
                if (dType === "percentage" && dVal > 0) sale = base - base * (dVal / 100)
                else if ((dType === "fixed" || dType === "amount") && dVal > 0) sale = Math.max(0, base - dVal)
                return { price: base, mrp: mrpVal, dType, dVal, sale, discAmt: Math.max(0, mrpVal - sale) }
            })
            const bestVar = varDetails.reduce((best: any, v: any) => v.discAmt > (best?.discAmt || 0) ? v : best, null)
            issues.push({ name: p.name, id: p.id, hasProdDisc, hasAnyVarDisc, result, varDetails, bestVar })
        }
    }

    console.log(`Products analyzed: ${data?.length || 0}`)
    console.log(`Should have badge: ${shouldHaveBadge}`)
    console.log(`Has badge with compute: ${hasBadge}`)
    console.log(`Discrepancies: ${issues.length}\n`)

    if (issues.length > 0) {
        for (const issue of issues) {
            console.log(`=== ${issue.name} ===`)
            console.log(`  prod disc: type=${issue.bestVar?.dType} val=${issue.bestVar?.dVal}`)
            console.log(`  result: hasDiscount=${issue.result.hasDiscount} sale=${issue.result.salePrice} discPct=${issue.result.discountPercentage} discAmt=${issue.result.discountAmount}`)
            for (const vd of issue.varDetails) {
                console.log(`  variant: price=${vd.price} dType="${vd.dType}" dVal=${vd.dVal} sale=${vd.sale} discAmt=${vd.discAmt}`)
            }
            console.log()
        }
    }
}

main().catch(console.error)
