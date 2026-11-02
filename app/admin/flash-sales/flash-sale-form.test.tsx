import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {FlashSaleForm} from './flash-sale-form'
import {emptyFlashTargets,type FlashSaleRow} from '@/lib/flash-sale-helper'
import type {FlashEditorData} from '@/lib/flash-sale-data'
const mocks=vi.hoisted(()=>({save:vi.fn(),push:vi.fn(),refresh:vi.fn()}))
vi.mock('@/app/actions/flash-sales',()=>({createFlashSale:mocks.save,updateFlashSale:mocks.save}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push,refresh:mocks.refresh,back:vi.fn()})}))
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}))
vi.mock('@/lib/flash-sale-client',()=>({notifyFlashSalesChanged:vi.fn()}))
;(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true
let root:Root,container:HTMLDivElement
const ids=Array.from({length:8},(_,i)=>`90000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)
const data:FlashEditorData={categories:[{id:ids[3],name:'Lips'}],sales:[],bxgyRules:[],products:[
 {id:ids[1],name:'Milani lipstick',brand:'Milani',category_id:ids[3],product_categories:[],discount_type:'percentage',discount_value:20,product_variants:[{id:ids[4],title:'Rose',price:1000,stock:5,discount_type:'none',discount_value:0},{id:ids[5],title:'Red',price:500,stock:3,discount_type:'none',discount_value:0}]},
 {id:ids[2],name:'RELOVE blush',brand:'RELOVE',category_id:null,product_categories:[],discount_type:'none',discount_value:0,product_variants:[{id:ids[6],title:'Peach',price:700,stock:4,discount_type:'none',discount_value:0}]},
]}
const initial=():FlashSaleRow&{id:string;updated_at:string}=>({id:ids[0],name:'Weekend',scope:'product',product_id:null,category_id:null,brand:null,target_config:{...emptyFlashTargets(),product_ids:[ids[1]]},discount_type:'percentage',discount_value:40,label:'Weekend',starts_at:'2026-11-10T06:00:00Z',ends_at:'2099-01-01T00:00:00Z',lifecycle:'draft',is_active:false,updated_at:'2026-11-01T00:00:00Z'})
async function render(patch:Partial<FlashSaleRow>={}){await act(async()=>root.render(<FlashSaleForm data={data} initialData={{...initial(),...patch}}/>))}
const checkbox=(text:string)=>[...container.querySelectorAll('label')].find(label=>label.textContent?.includes(text)&&label.querySelector('input[type="checkbox"]'))!.querySelector<HTMLInputElement>('input')!
async function saveDraft(){const button=[...container.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Save draft')!;await act(async()=>container.querySelector('form')!.requestSubmit(button))}
beforeEach(()=>{vi.clearAllMocks();mocks.save.mockResolvedValue({success:true,id:ids[0]});container=document.createElement('div');document.body.append(container);root=createRoot(container)})
afterEach(()=>{act(()=>root.unmount());container.remove()})
it('restores selected names, actual prices and explicit IST times when editing',async()=>{
 await render()
 expect(checkbox('Milani lipstick')).toBeChecked()
 expect(container.textContent).toContain('1 products · 2 variants')
 expect(container.textContent).toContain('₹600');expect(container.textContent).toContain('₹300')
 expect(container.querySelector<HTMLInputElement>('[aria-label="Starts at — IST"]')!.value).toBe('2026-11-10T11:30')
 await saveDraft()
 const payload=JSON.parse(mocks.save.mock.calls[0][1].get('payload'))
 expect(payload.starts_at).toBe('2026-11-10T06:00:00.000Z')
 expect(mocks.save.mock.calls[0][1].get('expected_updated_at')).toBe('2026-11-01T00:00:00Z')
})
it('restricts a product to selected variants while preserving other selected product variants',async()=>{
 await render({target_config:{...emptyFlashTargets(),product_ids:[ids[1]],variant_ids:[{product_id:ids[2],variant_id:ids[6]}]}})
 act(()=>checkbox('Rose').click())
 await saveDraft()
 const payload=JSON.parse(mocks.save.mock.calls[0][1].get('payload'))
 expect(payload.target_config.product_ids).toEqual([])
 expect(payload.target_config.variant_ids).toEqual(expect.arrayContaining([{product_id:ids[1],variant_id:ids[5]},{product_id:ids[2],variant_id:ids[6]}]))
})
it('saves multiple eligible brands from the real selector',async()=>{
 await render({scope:'brand',target_config:{...emptyFlashTargets(),brands:['Milani']}})
 act(()=>checkbox('RELOVE').click());await saveDraft()
 const payload=JSON.parse(mocks.save.mock.calls[0][1].get('payload'))
 expect(payload.target_config.brands).toEqual(['Milani','RELOVE'])
})
it('renders a zero-price preview as zero and warns before publishing',async()=>{
 await render({discount_value:100})
 expect(container.textContent).toContain('₹0')
 expect(container.textContent).toContain('2 variants will be free')
})
it('keeps failures inline and does not navigate away',async()=>{
 mocks.save.mockResolvedValue({success:false,error:'Campaign changed. Refresh.'})
 await render();await saveDraft()
 expect(container.querySelector('[role="alert"]')).toHaveTextContent('Campaign changed. Refresh.')
 expect(mocks.push).not.toHaveBeenCalled()
})
