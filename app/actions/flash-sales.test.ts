// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
import {createFlashSale,updateFlashSale,changeFlashSaleState,duplicateFlashSale} from './flash-sales'
import {emptyFlashTargets} from '@/lib/flash-sale-helper'
import {revalidateTag} from 'next/cache'
const mocks=vi.hoisted(()=>({admin:vi.fn(),writes:[] as {table:string;kind:string;row:Record<string,unknown>}[]}))
vi.mock('@/lib/admin',()=>({requireAdmin:mocks.admin}))
const ids=Array.from({length:8},(_,i)=>`70000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
let tables:Record<string,Record<string,unknown>[]>
function db(){return {from(table:string){let match: (row:Record<string,unknown>)=>boolean=()=>true;let from=0,to=Infinity;let operation='';let patch:Record<string,unknown>={};const query={
 select:()=>query,order:()=>query,range:(a:number,b:number)=>{from=a;to=b;return query},eq:(key:string,value:unknown)=>{const old=match;match=row=>old(row)&&row[key]===value;return query},in:(key:string,values:unknown[])=>{const old=match;match=row=>old(row)&&values.includes(row[key]);return query},
 insert:(row:Record<string,unknown>)=>{operation='insert';patch=row;return query},update:(row:Record<string,unknown>)=>{operation='update';patch=row;return query},
 single:async()=>{let row:Record<string,unknown>|undefined;if(operation==='insert'){row={id:ids[7],...patch};tables[table].push(row)}else{row=tables[table]?.find(match);if(operation==='update'&&row)Object.assign(row,patch)}
 if(operation&&row)mocks.writes.push({table,kind:operation,row:patch});return {data:row||null,error:row?null:{code:'PGRST116',message:'Not found'}}},
 then:(resolve:(r:unknown)=>unknown)=>Promise.resolve({data:(tables[table]||[]).filter(match).slice(from,to+1),error:null}).then(resolve),
 };return query}}}
const input=()=>({name:'Milani weekend',label:'Weekend',scope:'product',target_config:{...emptyFlashTargets(),product_ids:[ids[1]]},discount_type:'percentage',discount_value:30,starts_at:'2026-01-01T00:00:00Z',ends_at:'2099-01-01T00:00:00Z',lifecycle:'draft'})
const form=(patch:Record<string,unknown>={})=>{const f=new FormData();f.set('payload',JSON.stringify({...input(),...patch}));return f}
beforeEach(()=>{vi.clearAllMocks();mocks.writes=[];tables={products:[{id:ids[1],brand:'Milani'},{id:ids[2],brand:'RELOVE'}],categories:[{id:ids[3]}],product_variants:[{id:ids[4],product_id:ids[1]},{id:ids[5],product_id:ids[2]}],flash_sales:[{...input(),id:ids[0],is_active:false,updated_at:'2026-11-01T00:00:00Z',product_id:null,category_id:null,brand:null}]};mocks.admin.mockResolvedValue({supabase:db()})})
it('saves a draft with atomic targets and invalidates the public definitions cache',async()=>{
 expect(await createFlashSale(form())).toMatchObject({success:true})
 expect(mocks.writes[0].row).toMatchObject({name:'Milani weekend',lifecycle:'draft',is_active:false,target_config:{product_ids:[ids[1]]}})
 expect(revalidateTag).toHaveBeenCalledWith('store-flash-sales',{expire:0})
})
it('persists variant-only targeting rather than silently targeting the whole product',async()=>{
 const target_config={...emptyFlashTargets(),variant_ids:[{product_id:ids[1],variant_id:ids[4]}]}
 expect(await createFlashSale(form({target_config}))).toMatchObject({success:true})
 expect(mocks.writes[0].row).toMatchObject({product_id:null,target_config:{product_ids:[],variant_ids:target_config.variant_ids}})
})
it('rejects a variant belonging to another product',async()=>{
 const target_config={...emptyFlashTargets(),variant_ids:[{product_id:ids[1],variant_id:ids[5]}]}
 expect(await createFlashSale(form({target_config}))).toMatchObject({success:false,error:'Variant does not belong to selected product'})
 expect(mocks.writes).toEqual([])
})
it('rejects missing catalog targets',async()=>{
 expect(await createFlashSale(form({target_config:{...emptyFlashTargets(),product_ids:[ids[6]]}}))).toMatchObject({success:false})
 expect(mocks.writes).toEqual([])
})
it('normalizes multiple brands and removes unused product targets',async()=>{
 expect(await createFlashSale(form({scope:'brand',target_config:{...input().target_config,brands:['Milani','RELOVE','Milani']}}))).toMatchObject({success:true})
 expect(mocks.writes[0].row).toMatchObject({target_config:{brands:['Milani','RELOVE'],product_ids:[]}})
})
it('requires the saved version to match when editing',async()=>{
 const f=form();f.set('expected_updated_at','2020-01-01T00:00:00Z')
 expect(await updateFlashSale(ids[0],f)).toMatchObject({success:false,error:'This campaign changed. Refresh before saving.'})
 expect(mocks.writes).toEqual([])
})
it('pauses and ends a future campaign without making the schedule invalid',async()=>{
 tables.flash_sales[0].starts_at='2098-01-01T00:00:00Z'
 const before={starts_at:tables.flash_sales[0].starts_at,ends_at:tables.flash_sales[0].ends_at}
 await changeFlashSaleState(ids[0],'pause');expect(tables.flash_sales[0]).toMatchObject({...before,lifecycle:'paused',is_active:false})
 await changeFlashSaleState(ids[0],'end');expect(tables.flash_sales[0]).toMatchObject({...before,lifecycle:'ended',is_active:false});expect(tables.flash_sales[0].ended_at).toBeTruthy()
})
it('starts a scheduled campaign now while preserving its end',async()=>{
 tables.flash_sales[0].starts_at='2098-01-01T00:00:00Z'
 await changeFlashSaleState(ids[0],'start')
 expect(tables.flash_sales[0]).toMatchObject({is_active:true,lifecycle:'published',ends_at:'2099-01-01T00:00:00Z'})
 expect(Date.parse(String(tables.flash_sales[0].starts_at))).toBeLessThanOrEqual(Date.now())
})
it('requires a new end date before publishing an expired campaign',async()=>{
 tables.flash_sales[0].ends_at='2026-01-02T00:00:00Z'
 await expect(changeFlashSaleState(ids[0],'publish')).rejects.toThrow('Edit the end time')
 expect(mocks.writes).toEqual([])
})
it('duplicates expired campaigns as drafts instead of activating them',async()=>{
 tables.flash_sales[0].ends_at='2026-01-02T00:00:00Z'
 expect(await duplicateFlashSale(ids[0])).toMatchObject({success:true})
 expect(mocks.writes[0].row).toMatchObject({lifecycle:'draft',is_active:false,name:'Copy of Milani weekend'})
})
it.each([{discount_value:101},{discount_type:'invalid'},{starts_at:'invalid'},{scope:'invalid'}])('rejects invalid admin input %j',async patch=>{
 expect(await createFlashSale(form(patch))).toMatchObject({success:false});expect(mocks.writes).toEqual([])
})
it('reports malformed JSON instead of partially saving',async()=>{
 const f=new FormData();f.set('payload','{')
 expect(await createFlashSale(f)).toMatchObject({success:false,error:'Invalid campaign details'});expect(mocks.writes).toEqual([])
})
it('checks administrator authorization before reading or mutating campaigns',async()=>{
 mocks.admin.mockRejectedValue(new Error('Unauthorized'))
 await expect(createFlashSale(form())).rejects.toThrow('Unauthorized');expect(mocks.writes).toEqual([])
})
