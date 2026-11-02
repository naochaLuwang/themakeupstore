'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Loader2, Trash2 } from 'lucide-react'
import { changeFlashSaleState, deleteFlashSale, duplicateFlashSale } from '@/app/actions/flash-sales'
import { flashSaleStatus, type FlashSaleRow } from '@/lib/flash-sale-helper'
import { useFlashSaleClock } from '@/hooks/use-flash-sale-clock'
import { notifyFlashSalesChanged } from '@/lib/flash-sale-client'
type Campaign=FlashSaleRow & {id:string;updated_at:string}
export function FlashSaleControls({sale}:{sale:Campaign}){
  const router=useRouter()
  const [pending,setPending]=useState<string|null>(null)
  const [optimistic,setOptimistic]=useState<{version:string;row:Campaign}|null>(null)
  const current=optimistic?.version===sale.updated_at?optimistic.row:sale
  const now=useFlashSaleClock([current])
  const status=flashSaleStatus(current,now)
  const change=async(action:'publish'|'pause'|'end'|'start')=>{
    setPending(action)
    setOptimistic({version:sale.updated_at,row:{...sale,is_active:action==='publish'||action==='start',lifecycle:action==='pause'?'paused':action==='end'?'ended':'published',...(action==='start'?{starts_at:new Date().toISOString()}:{})}})
    try{await changeFlashSaleState(sale.id,action);notifyFlashSalesChanged();router.refresh();toast.success('Campaign updated')}
    catch(error){setOptimistic(null);toast.error(error instanceof Error?error.message:'Could not update campaign')}
    finally{setPending(null)}
  }
  const duplicate=async()=>{setPending('duplicate');try{const result=await duplicateFlashSale(sale.id);if(!result.success)throw new Error(result.error);router.push(`/admin/flash-sales/edit/${result.id}`);router.refresh();toast.success('Draft copy created')}catch(error){toast.error(error instanceof Error?error.message:'Could not duplicate')}finally{setPending(null)}}
  const remove=async()=>{if(!confirm('Delete this campaign permanently?'))return;setPending('delete');try{await deleteFlashSale(sale.id);notifyFlashSalesChanged();router.refresh();toast.success('Campaign deleted')}catch(error){toast.error(error instanceof Error?error.message:'Could not delete')}finally{setPending(null)}}
  return <div className="space-y-2"><span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold capitalize ${status==='live'?'bg-emerald-50 text-emerald-700':status==='scheduled'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-500'}`}>{status}</span><div className="flex flex-wrap gap-2">
    {(status==='draft'||status==='paused')&&<button disabled={!!pending} onClick={()=>change('publish')} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50">{status==='draft'?'Publish':'Resume'}</button>}
    {(status==='live'||status==='scheduled')&&<button disabled={!!pending} onClick={()=>change('pause')} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50">Pause</button>}
    {status==='scheduled'&&<button disabled={!!pending} onClick={()=>change('start')} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50">Start now</button>}
    {(status==='live'||status==='scheduled'||status==='paused')&&<button disabled={!!pending} onClick={()=>change('end')} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50">End now</button>}
    <button aria-label="Duplicate campaign" disabled={!!pending} onClick={duplicate} className="rounded-lg h-9 w-9 border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-50"><Copy className="h-4 w-4"/></button>
    <button aria-label="Delete campaign" disabled={!!pending} onClick={remove} className="rounded-lg h-9 w-9 border border-slate-200 text-slate-500 inline-flex items-center justify-center hover:text-red-600 disabled:opacity-50">{pending==='delete'?<Loader2 className="h-4 w-4 animate-spin"/>:<Trash2 className="h-4 w-4"/>}</button>
    {pending&&pending!=='delete'&&<Loader2 className="h-4 w-4 animate-spin text-slate-400 my-2"/>}
  </div></div>
}
