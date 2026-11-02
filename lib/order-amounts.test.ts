// @vitest-environment node
import {expect,it} from 'vitest'
import {allocateMoney,refundableLineAmount} from './order-amounts'
import {fromStoreDateTime,toStoreDateTime} from './store-time'
it('allocates exact paise across lines deterministically',()=>{expect(allocateMoney(1,[1,1,1])).toEqual([0.34,0.33,0.33])})
it('refunds only the paid share of a BXGY line, including cumulative rounding',()=>{
 const item={quantity:3,unit_price:100,line_discount_amount:100}
 const first=refundableLineAmount(item,1),second=refundableLineAmount({...item,refunded_quantity:1},1),last=refundableLineAmount({...item,refunded_quantity:2},1)
 expect([first,second,last]).toEqual([66.67,66.66,66.67]);expect(Math.round((first+second+last)*100)).toBe(20000)
})
it('assigns no cash refund to a free gift or fully discounted line',()=>{expect(refundableLineAmount({quantity:1,unit_price:0,line_discount_amount:0},1)).toBe(0);expect(refundableLineAmount({quantity:1,unit_price:100,line_discount_amount:100},1)).toBe(0)})
it('fails closed on historical unallocated discounts and invalid quantities',()=>{expect(()=>refundableLineAmount({quantity:3,unit_price:100},1)).toThrow('older order');expect(()=>refundableLineAmount({quantity:3,unit_price:100,line_discount_amount:100,refunded_quantity:2},2)).toThrow('quantity')})
it('shows and saves campaign dates in the store timezone without shifting an edited time',()=>{expect(toStoreDateTime('2026-10-31T10:00:00Z')).toBe('2026-10-31T15:30');expect(fromStoreDateTime('2026-10-31T15:30')).toBe('2026-10-31T10:00:00.000Z')})
