'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Search, X } from 'lucide-react'
import { createFlashSale, updateFlashSale } from '@/app/actions/flash-sales'
import { notifyFlashSalesChanged } from '@/lib/flash-sale-client'
import { emptyFlashTargets, type FlashSaleRow, type FlashTargets } from '@/lib/flash-sale-helper'
import { flashSaleSchema, normalizeFlashInput, type FlashSaleInput } from '@/lib/flash-sale-admin'
import { previewFlashCampaign } from '@/lib/flash-sale-preview'
import type { FlashEditorData } from '@/lib/flash-sale-data'
import { fromStoreDateTime, toStoreDateTime } from '@/lib/store-time'

interface Props { data: FlashEditorData; initialData?: FlashSaleRow & { id: string; updated_at: string } }
const field='w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-pink-500 focus:bg-white'
const caption='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'
export function FlashSaleForm({data,initialData}:Props){
  const router=useRouter()
  const initial=initialData?normalizeFlashInput(initialData):null
  const [expectedVersion]=useState(initialData?.updated_at)
  const [name,setName]=useState(initial?.name || '')
  const [scope,setScope]=useState<FlashSaleInput['scope']>(initial?.scope || 'product')
  const [targets,setTargets]=useState<FlashTargets>(initial?.target_config || emptyFlashTargets())
  const [type,setType]=useState<FlashSaleInput['discount_type']>(initial?.discount_type || 'percentage')
  const [value,setValue]=useState(String(initial?.discount_value || ''))
  const [label,setLabel]=useState(initial?.label || '')
  const [start,setStart]=useState(toStoreDateTime(initial?.starts_at))
  const [end,setEnd]=useState(toStoreDateTime(initial?.ends_at))
  const [search,setSearch]=useState('')
  const [excludeSearch,setExcludeSearch]=useState('')
  const [pending,setPending]=useState(false)
  const [error,setError]=useState('')
  const brands=useMemo(()=>[...new Set(data.products.map(p=>p.brand).filter((b):b is string=>!!b))].sort(),[data.products])
  const filteredProducts=data.products.filter(p=>`${p.name} ${p.brand || ''}`.toLowerCase().includes(search.toLowerCase()))
  const toggle=(key:Exclude<keyof FlashTargets,'variant_ids'>,id:string)=>setTargets(prev=>({...prev,[key]:(prev[key] as string[]).includes(id)?(prev[key] as string[]).filter(x=>x!==id):[...(prev[key] as string[]),id]}))
  const toggleProduct=(id:string)=>setTargets(prev=>({...prev,product_ids:prev.product_ids.includes(id)?prev.product_ids.filter(x=>x!==id):[...prev.product_ids,id],variant_ids:prev.variant_ids.filter(v=>v.product_id!==id)}))
  const toggleVariant=(productId:string,variantId:string)=>setTargets(prev=>{
    const wasAll=prev.product_ids.includes(productId)
    const variants=wasAll?[...prev.variant_ids.filter(v=>v.product_id!==productId),...(data.products.find(p=>p.id===productId)?.product_variants || []).map(v=>({product_id:productId,variant_id:v.id}))]:prev.variant_ids
    return {...prev,product_ids:prev.product_ids.filter(id=>id!==productId),variant_ids:variants.some(v=>v.variant_id===variantId)?variants.filter(v=>v.variant_id!==variantId):[...variants,{product_id:productId,variant_id:variantId}]}
  })
  const input=useMemo<FlashSaleInput>(()=>{
    let starts_at='',ends_at=''
    try{starts_at=fromStoreDateTime(start)||'';ends_at=fromStoreDateTime(end)||''}catch{}
    return {name,label,scope,target_config:targets,discount_type:type,discount_value:Number(value),starts_at,ends_at,lifecycle:'draft'}
  },[name,label,scope,targets,type,value,start,end])
  const preview=useMemo(()=>previewFlashCampaign(input,data.products,data.sales,data.bxgyRules,initialData?.id),[input,data,initialData?.id])
  const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setError('')
    const intent=(e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') || initial?.lifecycle || 'draft'
    const parsed=flashSaleSchema.safeParse({...input,lifecycle:intent})
    if(!parsed.success){setError(parsed.error.issues.map(i=>i.message).join('. '));return}
    if(intent==='published'&&!preview.variantCount){setError('This campaign has no eligible variants. Review its targets and exclusions.');return}
    setPending(true)
    try{
      const form=new FormData();form.set('payload',JSON.stringify(parsed.data));if(expectedVersion)form.set('expected_updated_at',expectedVersion)
      const result=initialData?await updateFlashSale(initialData.id,form):await createFlashSale(form)
      if(!result.success){setError(result.error);return}
      notifyFlashSalesChanged()
      toast.success(intent==='draft'?'Draft saved':'Campaign saved');router.push('/admin/flash-sales');router.refresh()
    }catch(err){setError(err instanceof Error?err.message:'Could not save campaign')}finally{setPending(false)}
  }
  return <form onSubmit={submit} className="space-y-6">
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)] items-start">
      <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-sm space-y-6 min-w-0">
        <label className="block"><span className={caption}>Campaign name</span><input aria-label="Campaign name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className={field} placeholder="Milani weekend sale"/></label>
        <fieldset><legend className={caption}>Eligible products</legend><div className="flex flex-wrap gap-2">{(['product','category','brand','all'] as const).map(option=><button type="button" key={option} aria-pressed={scope===option} onClick={()=>{setScope(option);setSearch('')}} className={`h-10 px-4 rounded-xl border text-sm font-semibold ${scope===option?'border-pink-300 bg-pink-50 text-pink-700':'border-slate-200 text-slate-600'}`}>{option==='all'?'Whole store':option==='product'?'Products / variants':option==='category'?'Categories':'Brands'}</button>)}</div></fieldset>
        {scope!=='all'&&<div className="space-y-3"><div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input aria-label="Search targets" className={`${field} pl-9`} value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${scope==='product'?'products':scope==='brand'?'brands':'categories'}...`}/></div>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {scope==='product'&&filteredProducts.map(p=><details key={p.id} className="p-3" open={!!search || targets.product_ids.includes(p.id) || targets.variant_ids.some(v=>v.product_id===p.id)}><summary className="cursor-pointer text-sm text-slate-800"><label onClick={e=>e.stopPropagation()} className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={targets.product_ids.includes(p.id)} onChange={()=>toggleProduct(p.id)} className="accent-pink-600"/>{p.name}<span className="text-xs text-slate-400">All variants</span></label></summary><div className="pt-2 pl-5 space-y-2">{(p.product_variants || []).map(v=><label key={v.id} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={targets.product_ids.includes(p.id)||targets.variant_ids.some(x=>x.variant_id===v.id)} onChange={()=>toggleVariant(p.id,v.id)} className="accent-pink-600"/><span className="flex-1">{v.title || 'Default'}</span><span>₹{Number(v.price).toLocaleString('en-IN')} · {v.stock} in stock</span></label>)}</div></details>)}
            {scope==='brand'&&brands.filter(b=>b.toLowerCase().includes(search.toLowerCase())).map(b=><label key={b} className="p-3 flex gap-3 text-sm cursor-pointer"><input type="checkbox" checked={targets.brands.includes(b)} onChange={()=>toggle('brands',b)} className="accent-pink-600"/>{b}</label>)}
            {scope==='category'&&data.categories.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).map(c=><label key={c.id} className="p-3 flex gap-3 text-sm cursor-pointer"><input type="checkbox" checked={targets.category_ids.includes(c.id)} onChange={()=>toggle('category_ids',c.id)} className="accent-pink-600"/>{c.name}</label>)}
          </div><p className="text-xs text-slate-500">{scope==='product'?`${targets.product_ids.length} whole products + ${targets.variant_ids.length} individual variants`:scope==='brand'?`${targets.brands.length} brands`:`${targets.category_ids.length} categories`} selected.</p>
          <div className="flex flex-wrap gap-2">{(scope==='product'?targets.product_ids:scope==='brand'?targets.brands:targets.category_ids).map(id=><button type="button" key={id} onClick={()=>scope==='product'?toggleProduct(id):toggle(scope==='brand'?'brands':'category_ids',id)} className="rounded-lg border px-2 py-1 text-xs text-slate-600 inline-flex gap-2 items-center">{scope==='product'?data.products.find(p=>p.id===id)?.name || 'Unavailable product':scope==='brand'?id:data.categories.find(c=>c.id===id)?.name || 'Unavailable category'}<X className="h-3 w-3"/></button>)}</div>
          {scope==='product'&&<div className="flex flex-wrap gap-2">{targets.variant_ids.map(v=><button type="button" key={v.variant_id} onClick={()=>setTargets(prev=>({...prev,variant_ids:prev.variant_ids.filter(x=>x.variant_id!==v.variant_id)}))} className="rounded-lg border px-2 py-1 text-xs text-slate-600 inline-flex gap-2 items-center">{data.products.find(p=>p.id===v.product_id)?.name || 'Unavailable product'} · {data.products.find(p=>p.id===v.product_id)?.product_variants.find(x=>x.id===v.variant_id)?.title || 'Unavailable variant'}<X className="h-3 w-3"/></button>)}</div>}
        </div>}
        <details className="rounded-xl border border-slate-200 p-4"><summary className="text-sm font-semibold text-slate-800 cursor-pointer">Exclusions ({targets.exclude_product_ids.length+targets.exclude_variant_ids.length+targets.exclude_category_ids.length+targets.exclude_brands.length})</summary><p className="mt-2 text-xs text-slate-500">Exclusions always take precedence over selected targets.</p><input aria-label="Search exclusions" className={`${field} mt-3`} value={excludeSearch} onChange={e=>setExcludeSearch(e.target.value)} placeholder="Search products, brands or categories..."/><div className="mt-3 max-h-64 overflow-auto space-y-3">
          <p className="text-xs font-bold text-slate-500">Products and variants</p>{data.products.filter(p=>p.name.toLowerCase().includes(excludeSearch.toLowerCase())).map(p=><details key={p.id}><summary className="text-xs cursor-pointer"><label onClick={e=>e.stopPropagation()} className="inline-flex gap-2 items-center"><input type="checkbox" checked={targets.exclude_product_ids.includes(p.id)} onChange={()=>toggle('exclude_product_ids',p.id)} className="accent-pink-600"/>{p.name}</label></summary><div className="pl-5 pt-2 space-y-2">{p.product_variants.map(v=><label key={v.id} className="flex gap-2 text-xs text-slate-500"><input type="checkbox" checked={targets.exclude_variant_ids.includes(v.id)} onChange={()=>toggle('exclude_variant_ids',v.id)} className="accent-pink-600"/>{v.title || 'Default'}</label>)}</div></details>)}
          <p className="text-xs font-bold text-slate-500">Brands</p>{brands.filter(b=>b.toLowerCase().includes(excludeSearch.toLowerCase())).map(b=><label key={b} className="flex gap-2 text-xs"><input type="checkbox" checked={targets.exclude_brands.includes(b)} onChange={()=>toggle('exclude_brands',b)} className="accent-pink-600"/>{b}</label>)}
          <p className="text-xs font-bold text-slate-500">Categories</p>{data.categories.filter(c=>c.name.toLowerCase().includes(excludeSearch.toLowerCase())).map(c=><label key={c.id} className="flex gap-2 text-xs"><input type="checkbox" checked={targets.exclude_category_ids.includes(c.id)} onChange={()=>toggle('exclude_category_ids',c.id)} className="accent-pink-600"/>{c.name}</label>)}
        </div><div className="mt-3 flex flex-wrap gap-2">{(['exclude_product_ids','exclude_variant_ids','exclude_category_ids','exclude_brands'] as const).flatMap(key=>targets[key].map(id=><button type="button" key={`${key}:${id}`} onClick={()=>toggle(key,id)} className="rounded-lg border px-2 py-1 text-xs text-slate-600 inline-flex items-center gap-2">{key==='exclude_product_ids'?data.products.find(p=>p.id===id)?.name || 'Unavailable product':key==='exclude_variant_ids'?data.products.flatMap(p=>p.product_variants).find(v=>v.id===id)?.title || 'Unavailable variant':key==='exclude_category_ids'?data.categories.find(c=>c.id===id)?.name || 'Unavailable category':id}<X className="h-3 w-3"/></button>))}</div></details>
        <div className="grid grid-cols-2 gap-4"><label><span className={caption}>Discount type</span><select aria-label="Discount type" className={field} value={type} onChange={e=>setType(e.target.value as 'percentage'|'fixed')}><option value="percentage">Percentage off</option><option value="fixed">Rupees off</option></select></label><label><span className={caption}>Discount value</span><input aria-label="Discount value" className={field} type="number" required min="0.01" max={type==='percentage'?100:100000000} step="0.01" value={value} onChange={e=>setValue(e.target.value)}/></label></div>
        <p className="text-xs text-slate-500">Calculated from original variant prices. Customers keep their normal price when it is lower.</p>
        <label className="block"><span className={caption}>Storefront label (optional)</span><input aria-label="Storefront label" className={field} value={label} maxLength={120} onChange={e=>setLabel(e.target.value)} placeholder="Weekend sale"/></label>
        <div className="grid gap-4 md:grid-cols-2"><label><span className={caption}>Starts at — IST</span><input aria-label="Starts at — IST" className={field} type="datetime-local" required value={start} onChange={e=>setStart(e.target.value)}/></label><label><span className={caption}>Ends at — IST</span><input aria-label="Ends at — IST" className={field} type="datetime-local" required value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
      </div>
      <aside className="rounded-2xl border bg-white p-6 shadow-sm space-y-4 xl:sticky xl:top-6 min-w-0">
        <h2 className="text-lg font-black tracking-tight text-slate-900">Real price preview</h2><p className="text-sm text-slate-500">{preview.productCount} products · {preview.variantCount} variants · {preview.rows.reduce((n,r)=>n+r.stock,0)} units in stock</p>
        {preview.betterNormalCount>0&&<p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{preview.betterNormalCount} variants already have an equal or better normal price.</p>}
        {!!preview.overlappingCampaigns.length&&<p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Overlapping campaigns: {preview.overlappingCampaigns.join(', ')}. The lowest price wins for each variant.</p>}
        {!!preview.zeroPriceCount&&<p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{preview.zeroPriceCount} variants will be free. Review this before publishing.</p>}
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500 border-b"><th className="py-2 pr-2">Variant</th><th className="py-2 px-2 text-right">Original</th><th className="py-2 px-2 text-right">Normal</th><th className="py-2 pl-2 text-right">You pay</th></tr></thead><tbody>{preview.rows.slice(0,12).map(row=><tr key={row.variantId} className="border-b border-slate-100"><td className="py-3 pr-2"><p className="font-semibold text-slate-800">{row.name}</p><p className="text-slate-500">{row.title || 'Default'}</p>{row.bxgy&&<p className="text-[10px] text-pink-700 mt-1">3-unit BXGY example: ₹{row.threeUnitTotal.toLocaleString('en-IN')}{row.replaceBXGY?' · Original prices on offer units':''}</p>}</td><td className="px-2 text-right">₹{row.mrp.toLocaleString('en-IN')}</td><td className="px-2 text-right">₹{row.normal.toLocaleString('en-IN')}</td><td className="pl-2 text-right font-bold text-pink-700">₹{row.final.toLocaleString('en-IN')}</td></tr>)}</tbody></table></div>
        {!preview.variantCount&&<p className="text-sm text-slate-400">Select targets to preview actual product prices.</p>}{preview.variantCount>12&&<p className="text-xs text-slate-400">Showing 12 of {preview.variantCount} eligible variants.</p>}
        <p className="text-xs leading-relaxed text-slate-500">Preview uses current catalog prices at the planned start, or now if already started. Overlapping offers may change later. BXGY examples assume eligibility; mixed baskets can qualify differently. Recheck before publishing.</p>
      </aside>
    </div>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={pending} onClick={()=>router.back()} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold">Cancel</button><button type="submit" value="draft" disabled={pending} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold disabled:opacity-50">Save draft</button>{initialData&&initial?.lifecycle!=='draft'&&<button type="submit" value={initial?.lifecycle} disabled={pending} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold disabled:opacity-50">Save changes</button>}<button type="submit" value="published" disabled={pending} className="h-11 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center gap-2">{pending&&<Loader2 className="h-4 w-4 animate-spin"/>}{initial?.lifecycle==='published'?'Save and publish':'Publish campaign'}</button></div>
  </form>
}
