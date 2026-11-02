import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {FlashSalesProvider,useFlashSales} from '@/components/store/flash-sales-provider'
import {variantFlashPricing,type FlashSaleRow} from '@/lib/flash-sale-helper'
import {useCart} from '@/components/store/use-cart'
const baseTime=Date.parse('2026-11-02T12:00:00Z')
let root:Root,container:HTMLDivElement
;(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true
const sale=():FlashSaleRow=>({id:'r',scope:'all',product_id:null,category_id:null,brand:null,discount_type:'percentage',discount_value:40,label:'Sale',starts_at:new Date(baseTime+1000).toISOString(),ends_at:new Date(baseTime+2000).toISOString(),is_active:true,lifecycle:'published'})
function Probe(){const {sales,now}=useFlashSales();const price=variantFlashPricing({id:'v',price:1000},{id:'p',discount_type:'percentage',discount_value:20},sales,now);return <p>{price.salePrice}</p>}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(baseTime);useCart.setState({offerCatalog:{ownerId:null,bxgyRules:[],giftRules:[],giftOptions:[],usedBXGY:[],usedGifts:[],flashSales:[sale()],expiresAt:baseTime+1000}});container=document.createElement('div');document.body.append(container);root=createRoot(container)})
afterEach(()=>{act(()=>root.unmount());container.remove();vi.useRealTimers()})
it('updates at exact start and end boundaries without waiting for a network refresh',async()=>{
 await act(async()=>root.render(<FlashSalesProvider><Probe/></FlashSalesProvider>))
 expect(container.textContent).toBe('800')
 await act(async()=>vi.advanceTimersByTimeAsync(1000));expect(container.textContent).toBe('600')
 await act(async()=>vi.advanceTimersByTimeAsync(1000));expect(container.textContent).toBe('800')
})
it('reconciles immediately on focus after a sleeping device resumes',async()=>{
 await act(async()=>root.render(<FlashSalesProvider><Probe/></FlashSalesProvider>))
 vi.setSystemTime(baseTime+3000)
 act(()=>window.dispatchEvent(new Event('focus')))
 expect(container.textContent).toBe('800')
})
it('uses new snapshots for manually paused campaigns',async()=>{
 await act(async()=>root.render(<FlashSalesProvider><Probe/></FlashSalesProvider>));await act(async()=>vi.advanceTimersByTimeAsync(1000))
 expect(container.textContent).toBe('600')
 act(()=>useCart.setState({offerCatalog:{...useCart.getState().offerCatalog!,flashSales:[{...sale(),is_active:false,lifecycle:'paused'}]}}))
 expect(container.textContent).toBe('800')
})
