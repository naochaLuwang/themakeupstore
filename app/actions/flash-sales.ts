'use server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { flashSaleSchema, normalizeFlashInput, normalizedTargets, type FlashSaleInput } from '@/lib/flash-sale-admin'
import { flashReadIds } from '@/lib/flash-sale-data'
import { FLASH_CACHE_TAG } from '@/lib/flash-sale-cache'
import { uuidPattern } from '@/lib/cart-quote'

function invalidate() { revalidateTag(FLASH_CACHE_TAG,{expire:0}); revalidatePath('/admin/flash-sales') }
function validId(id:string) { if(!uuidPattern.test(id))throw new Error('Invalid campaign ID') }
async function validateTargets(db:Awaited<ReturnType<typeof requireAdmin>>['supabase'], input:FlashSaleInput) {
  const t=normalizedTargets(input)
  const productIds=[...new Set([...t.product_ids,...t.exclude_product_ids,...t.variant_ids.map(v=>v.product_id)])]
  const categoryIds=[...new Set([...t.category_ids,...t.exclude_category_ids])]
  const variantIds=[...new Set([...t.variant_ids.map(v=>v.variant_id),...t.exclude_variant_ids])]
  const brands=[...new Set([...t.brands,...t.exclude_brands])]
  const [p,c,v,b]=await Promise.all([
    flashReadIds(db,'products','id','id',productIds),
    flashReadIds(db,'categories','id','id',categoryIds),
    flashReadIds(db,'product_variants','id,product_id','id',variantIds),
    flashReadIds(db,'products','brand','brand',brands),
  ])
  if([p,c,v,b].some(r=>r.error))throw new Error('Could not validate campaign targets')
  if(productIds.some(id=>!p.data?.some(row=>row.id===id)))throw new Error('A selected product no longer exists')
  if(categoryIds.some(id=>!c.data?.some(row=>row.id===id)))throw new Error('A selected category no longer exists')
  if(variantIds.some(id=>!v.data?.some(row=>row.id===id)))throw new Error('A selected variant no longer exists')
  if(t.variant_ids.some(target=>!v.data?.some(row=>row.id===target.variant_id&&row.product_id===target.product_id)))throw new Error('Variant does not belong to selected product')
  if(brands.some(brand=>!b.data?.some(row=>row.brand===brand)))throw new Error('A selected brand no longer exists')
  return t
}
async function save(id:string|null,formData:FormData) {
  const {supabase}=await requireAdmin()
  try {
    if(id)validId(id)
    let raw:unknown
    try {raw=JSON.parse(String(formData.get('payload')||''))}catch{throw new Error('Invalid campaign details')}
    const parsed=flashSaleSchema.safeParse(raw)
    if(!parsed.success)throw new Error(parsed.error.issues.map(i=>i.message).join('. '))
    const input=parsed.data
    const targets=await validateTargets(supabase,input)
    const row={...input,target_config:targets,is_active:input.lifecycle==='published',product_id:null,category_id:null,brand:null,
      ...(input.lifecycle==='ended'?(id?{}:{ended_at:new Date().toISOString()}):{ended_at:null}),updated_at:new Date().toISOString()}
    let query=id?supabase.from('flash_sales').update(row).eq('id',id):supabase.from('flash_sales').insert(row)
    const expected=formData.get('expected_updated_at')
    if(id&&typeof expected==='string'&&expected)query=query.eq('updated_at',expected)
    const {data,error}=await query.select('id').single()
    if(error||!data)throw new Error(error?.code==='PGRST116'?'This campaign changed. Refresh before saving.':error?.message||'Campaign could not be saved')
    invalidate()
    return {success:true as const,id:data.id as string}
  }catch(error){return {success:false as const,error:error instanceof Error?error.message:'Could not save campaign'}}
}
export async function createFlashSale(formData:FormData){return save(null,formData)}
export async function updateFlashSale(id:string,formData:FormData){return save(id,formData)}
export async function getFlashSales(){const {supabase}=await requireAdmin();const {data,error}=await supabase.from('flash_sales').select('*').order('created_at',{ascending:false});if(error)throw error;return data}
export async function getFlashSale(id:string){const {supabase}=await requireAdmin();validId(id);const {data,error}=await supabase.from('flash_sales').select('*').eq('id',id).single();if(error)throw error;return data}
export async function changeFlashSaleState(id:string,action:'publish'|'pause'|'end'|'start') {
  const {supabase}=await requireAdmin();validId(id)
  if(!['publish','pause','end','start'].includes(action))throw new Error('Invalid campaign action')
  const {data:current,error}=await supabase.from('flash_sales').select('*').eq('id',id).single()
  if(error||!current)throw new Error('Campaign not found')
  if((action==='publish'||action==='start')&&Date.parse(current.ends_at)<=Date.now())throw new Error('Edit the end time before publishing an ended campaign')
  const lifecycle=action==='pause'?'paused':action==='end'?'ended':'published'
  const change={lifecycle,is_active:lifecycle==='published',updated_at:new Date().toISOString(),ended_at:action==='end'?new Date().toISOString():null,
    ...(action==='start'?{starts_at:new Date().toISOString()}:{})}
  // Validate the current definition before making it available to customers.
  if(lifecycle==='published'){
    const parsed=flashSaleSchema.safeParse({...normalizeFlashInput(current),...change})
    if(!parsed.success)throw new Error('Review the campaign details before publishing')
    await validateTargets(supabase,parsed.data)
  }
  const result=await supabase.from('flash_sales').update(change).eq('id',id).eq('updated_at',current.updated_at).select('id').single()
  if(result.error||!result.data)throw new Error('The campaign changed. Refresh and try again.')
  invalidate();return {success:true as const}
}
export async function duplicateFlashSale(id:string){
  const current=await getFlashSale(id)
  const input={...normalizeFlashInput(current),name:`Copy of ${current.name||current.label||'Flash sale'}`.slice(0,120),lifecycle:'draft'}
  const form=new FormData();form.set('payload',JSON.stringify(input))
  return createFlashSale(form)
}
export async function deleteFlashSale(id:string){const {supabase}=await requireAdmin();validId(id);const {error}=await supabase.from('flash_sales').delete().eq('id',id);if(error)throw new Error(error.message);invalidate()}
export async function toggleFlashSale(id:string,isActive:boolean){return changeFlashSaleState(id,isActive?'publish':'pause')}
export async function startFlashSale(id:string){return changeFlashSaleState(id,'start')}
export async function endFlashSale(id:string){return changeFlashSaleState(id,'end')}
export async function cancelFlashSale(id:string){return changeFlashSaleState(id,'pause')}
