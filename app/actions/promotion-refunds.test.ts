// @vitest-environment node
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {processPartialRefund} from './orders'
const mocks=vi.hoisted(()=>({admin:vi.fn(),rpc:vi.fn(),refund:vi.fn()}))
vi.mock('@/lib/admin',()=>({requireAdmin:mocks.admin}))
vi.mock('@/lib/verified-payment',async original=>({...await original<typeof import('@/lib/verified-payment')>(),refundPaymentOnce:mocks.refund}))
const id='00000000-0000-4000-8000-000000000001',key='00000000-0000-4000-8000-000000000002'
beforeEach(()=>{
 vi.clearAllMocks();vi.spyOn(console,'error').mockImplementation(()=>{})
 mocks.admin.mockResolvedValue({user:{id:'admin'},supabase:{rpc:mocks.rpc,from:()=>({select:()=>({eq:async()=>({data:[]})})})}})
 mocks.rpc.mockImplementation(async(name:string)=>name==='reserve_promotion_refund'?{data:{id:'refund-request',amount:1600,status:'reserved',payment_id:'pay_test'},error:null}:{data:1600,error:null})
 mocks.refund.mockResolvedValue('rfnd_test')
})
afterEach(()=>vi.restoreAllMocks())
it('refunds the reserved discounted amount and confirms the transaction after gateway acceptance',async()=>{
 expect(await processPartialRefund(id,[{itemId:id,quantity:3}],'Reason','razorpay',undefined,key)).toMatchObject({success:true,amount:1600})
 expect(mocks.refund).toHaveBeenCalledWith('pay_test',1600,'refund-request')
 expect(mocks.rpc).toHaveBeenLastCalledWith('finish_promotion_refund',{p_request_id:'refund-request',p_transaction_id:'rfnd_test'})
})
it('does not send money or change stock when reservation rejects an unsafe refund',async()=>{
 mocks.rpc.mockResolvedValue({data:null,error:{message:'Orders using coins require reviewed credit refund'}})
 expect(await processPartialRefund(id,[{itemId:id,quantity:3}],'Reason','razorpay',undefined,key)).toMatchObject({success:false})
 expect(mocks.refund).not.toHaveBeenCalled()
})
it('keeps the reservation retryable after a gateway timeout and uses the same refund key',async()=>{
 mocks.refund.mockRejectedValueOnce(new Error('Timeout'))
 expect(await processPartialRefund(id,[{itemId:id,quantity:3}],'Reason','razorpay',undefined,key)).toMatchObject({success:false})
 expect(mocks.rpc.mock.calls.filter(([n])=>n==='finish_promotion_refund')).toHaveLength(0)
 expect(await processPartialRefund(id,[{itemId:id,quantity:3}],'Reason','razorpay',undefined,key)).toMatchObject({success:true})
 expect(mocks.refund.mock.calls.map(call=>call[2])).toEqual(['refund-request','refund-request'])
})
it('does not repeat a completed refund',async()=>{
 mocks.rpc.mockResolvedValue({data:{amount:1600,status:'complete'},error:null})
 expect(await processPartialRefund(id,[{itemId:id,quantity:3}],'Reason','razorpay',undefined,key)).toMatchObject({success:true})
 expect(mocks.refund).not.toHaveBeenCalled();expect(mocks.rpc).toHaveBeenCalledTimes(1)
})
it('accepts a zero-cash gift return without calling the payment provider',async()=>{
 mocks.rpc.mockImplementation(async(name:string)=>name==='reserve_promotion_refund'?{data:{id:'r',amount:0,status:'reserved'},error:null}:{data:0,error:null})
 expect(await processPartialRefund(id,[{itemId:id,quantity:1}],'Gift returned','razorpay',undefined,key)).toMatchObject({success:true,amount:0})
 expect(mocks.refund).not.toHaveBeenCalled()
})
it('authorizes the administrator before any financial access',async()=>{
 mocks.admin.mockRejectedValue(new Error('Admin required'))
 await expect(processPartialRefund(id,[{itemId:id,quantity:1}],'','gpay','txn',key)).rejects.toThrow('Admin required')
 expect(mocks.rpc).not.toHaveBeenCalled()
})
