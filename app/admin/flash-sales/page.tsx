import { requireAdmin } from '@/lib/admin'
import { Plus, Edit3 } from 'lucide-react'
import Link from 'next/link'
import Form from 'next/form'
import { redirect } from 'next/navigation'
import { flashReadIds } from '@/lib/flash-sale-data'
import { FlashSaleControls } from '@/components/admin/flash-sale-controls'
import { flashTargets, type FlashSaleRow } from '@/lib/flash-sale-helper'
export default async function AdminFlashSalesPage({searchParams}:{searchParams:Promise<{q?:string;status?:string;scope?:string;page?:string}>}){
  const params=await searchParams
  const {supabase}=await requireAdmin()
  const page=Math.max(1,Math.min(100000,Number.parseInt(params.page || '1',10)||1))
  const q=(params.q || '').replace(/[,%()"\\]/g,' ').trim().slice(0,100)
  const status=['draft','scheduled','live','paused','ended'].includes(params.status||'')?params.status:''
  const scope=['product','category','brand','all'].includes(params.scope||'')?params.scope:''
  const now=new Date().toISOString()
  let query=supabase.from('flash_sales').select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id')
  const logical:string[]=[]
  if(q)logical.push(`or(name.ilike.%${q}%,label.ilike.%${q}%)`)
  if(scope)query=query.eq('scope',scope)
  if(status==='draft')query=query.eq('lifecycle','draft')
  if(status==='paused')query=query.eq('lifecycle','paused').gt('ends_at',now)
  if(status==='scheduled')query=query.eq('lifecycle','published').gt('starts_at',now).gt('ends_at',now)
  if(status==='live')query=query.eq('lifecycle','published').lte('starts_at',now).gt('ends_at',now)
  if(status==='ended'){query=query.neq('lifecycle','draft');logical.push(`or(lifecycle.eq.ended,ends_at.lte.${now})`)}
  if(logical.length)query=query.or(`and(${logical.join(',')})`)
  const {data:sales,error,count}=await query.range((page-1)*25,page*25-1)
  const pageHref=(target:number)=>`/admin/flash-sales?${new URLSearchParams({q,status:status||'',scope:scope||'',page:String(target)})}`
  if(error?.code==='PGRST103'&&page>1)redirect(pageHref(1))
  if(error)throw new Error(error.message)
  if(page>1&&!sales?.length)redirect(pageHref(Math.max(1,Math.ceil((count||0)/25))))
  const rows=(sales || []) as (FlashSaleRow & {id:string;updated_at:string})[]
  const ids=[...new Set(rows.flatMap(s=>{const t=flashTargets(s);return [...t.product_ids,...t.variant_ids.map(v=>v.product_id)]}))]
  const catIds=[...new Set(rows.flatMap(s=>flashTargets(s).category_ids))]
  const variantIds=[...new Set(rows.flatMap(s=>flashTargets(s).variant_ids.map(v=>v.variant_id)))]
  const [products,categories,variants]=await Promise.all([
    flashReadIds(supabase,'products','id,name','id',ids),
    flashReadIds(supabase,'categories','id,name','id',catIds),
    flashReadIds(supabase,'product_variants','id,title','id',variantIds),
  ])
  if(products.error||categories.error)throw new Error('Could not load campaign target names')
  const variantMap=new Map(variants.data.map(v=>[v.id,v.title]))
  const productMap=new Map((products.data||[]).map(p=>[p.id,p.name]))
  const categoryMap=new Map((categories.data||[]).map(c=>[c.id,c.name]))
  const targetName=(sale:FlashSaleRow)=>{const t=flashTargets(sale);return sale.scope==='all'?'Whole store':sale.scope==='brand'?t.brands.join(', '):sale.scope==='category'?t.category_ids.map(id=>categoryMap.get(id)||'Unavailable category').join(', '):[...t.product_ids.map(id=>productMap.get(id)||'Unavailable product'),...t.variant_ids.map(v=>`${productMap.get(v.product_id)||'Unavailable product'} (${variantMap.get(v.variant_id)||'Unavailable variant'})`)].join(', ')}
  const date=(value:string)=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))
  const href=pageHref
  return <div className="space-y-6">
    <div className="flex justify-between items-start gap-4"><div className="space-y-1"><h1 className="text-2xl font-black tracking-tight text-slate-900">Flash Sales</h1><p className="text-sm text-slate-500">Schedule campaigns, preview prices and manage eligibility. All times in IST.</p></div><Link href="/admin/flash-sales/new" className="rounded-xl h-11 px-5 bg-slate-900 text-white text-sm font-semibold inline-flex items-center gap-2 shrink-0"><Plus className="h-4 w-4"/>New campaign</Link></div>
    <Form action="/admin/flash-sales" className="flex flex-wrap gap-3"><input name="q" aria-label="Search campaigns" defaultValue={q} placeholder="Search campaign names or labels" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm min-w-60 flex-1"/><select name="status" aria-label="Filter status" defaultValue={status} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option>{['draft','scheduled','live','paused','ended'].map(s=><option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</select><select name="scope" aria-label="Filter scope" defaultValue={scope} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All scopes</option><option value="product">Products / variants</option><option value="category">Categories</option><option value="brand">Brands</option><option value="all">Whole store</option></select><button className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white">Filter</button>{(q||status||scope)&&<Link href="/admin/flash-sales" className="h-10 inline-flex items-center px-3 text-sm text-slate-500">Clear</Link>}</Form>
    <div className="rounded-2xl border bg-white overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50"><tr className="text-xs font-bold uppercase tracking-wider text-slate-500">{['Campaign / targets','Discount','Schedule — IST','Status / controls','Edit'].map(s=><th key={s} className="py-4 px-6">{s}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(sale=>{const t=flashTargets(sale);const exclusions=t.exclude_product_ids.length+t.exclude_variant_ids.length+t.exclude_category_ids.length+t.exclude_brands.length;return <tr key={sale.id} className="hover:bg-slate-50/40"><td className="py-4 px-6 max-w-xs"><p className="font-semibold text-sm text-slate-900">{sale.name||sale.label||'Flash sale'}</p><p className="mt-1 text-xs text-slate-500 line-clamp-2">{targetName(sale)}</p>{sale.label&&<p className="text-xs text-slate-400 mt-1">Label: {sale.label}</p>}{exclusions>0&&<p className="text-xs text-slate-400 mt-1">{exclusions} exclusions</p>}</td><td className="py-4 px-6 whitespace-nowrap text-sm font-semibold">{sale.discount_type==='percentage'?`${sale.discount_value}% off`:`₹${Number(sale.discount_value).toLocaleString('en-IN')} off`}</td><td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap"><p>{date(sale.starts_at)}</p><p className="mt-1">→ {date(sale.ends_at)}</p></td><td className="py-4 px-6 min-w-60"><FlashSaleControls sale={sale}/></td><td className="py-4 px-6"><Link aria-label={`Edit ${sale.name||'campaign'}`} href={`/admin/flash-sales/edit/${sale.id}`} className="rounded-lg h-9 w-9 border border-slate-200 inline-flex items-center justify-center text-slate-500"><Edit3 className="h-4 w-4"/></Link></td></tr>})}{!rows.length&&<tr><td colSpan={5} className="py-12 px-6 text-center text-sm text-slate-400">No campaigns match these filters.</td></tr>}</tbody></table></div></div>
    <div className="flex items-center justify-between gap-4 text-sm text-slate-500"><p>{count||0} campaigns · Page {page} of {Math.max(1,Math.ceil((count||0)/25))}</p><div className="flex gap-3">{page>1&&<Link href={href(page-1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2">Previous</Link>}{page*25<(count||0)&&<Link href={href(page+1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2">Next</Link>}</div></div>
  </div>
}
