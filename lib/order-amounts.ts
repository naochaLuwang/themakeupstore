import { roundMoney } from '@/lib/promotion-engine'

// Deterministic largest-remainder allocation keeps paise totals exact.
export function allocateMoney(total: number, weights: number[]) {
  const cents = Math.round(total*100), sum = weights.reduce((n,w)=>n+w,0)
  if (cents<0 || !Number.isSafeInteger(cents) || weights.some(w=>!Number.isFinite(w)||w<0)) throw new Error('Invalid monetary allocation')
  if (!sum) { if(cents)throw new Error('Cannot allocate a discount to an empty amount');return weights.map(()=>0) }
  const rows=weights.map((w,index)=>({index,exact:cents*w/sum,cents:Math.floor(cents*w/sum)}))
  let left=cents-rows.reduce((n,r)=>n+r.cents,0)
  for(const r of [...rows].sort((a,b)=>(b.exact-b.cents)-(a.exact-a.cents)||a.index-b.index)) { if(left<=0)break;r.cents++;left-- }
  return rows.map(r=>r.cents/100)
}

export function refundableLineAmount(item: { quantity:number; unit_price:number; line_discount_amount?:number|null; refunded_quantity?:number|null; refunded_amount?:number|null },quantity:number) {
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity+Number(item.refunded_quantity||0)>item.quantity)throw new Error('Invalid refund quantity')
  if(item.line_discount_amount==null)throw new Error('This older order needs its discounts reviewed before refunding.')
  const net=Math.max(0,roundMoney(Number(item.unit_price)*item.quantity-Number(item.line_discount_amount)))
  const refunded=Number(item.refunded_quantity||0)
  // Cumulative rounding ensures partial returns never refund above the line's net amount.
  return roundMoney(roundMoney(net*(refunded+quantity)/item.quantity)-roundMoney(net*refunded/item.quantity))
}
