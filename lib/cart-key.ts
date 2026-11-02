export function paidCartKey(items: {variantId:string;quantity:number;price:number;is_gift?:boolean;is_bxgy_free?:boolean}[]) {
  return JSON.stringify(items.filter(i=>!i.is_gift&&!i.is_bxgy_free).map(i=>[i.variantId,i.quantity,i.price]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))
}
