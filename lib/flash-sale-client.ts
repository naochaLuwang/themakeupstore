'use client'
import { useCart } from '@/components/store/use-cart'
export const FLASH_CHANGE_EVENT='store:flash-sales-changed'
export const FLASH_CHANGE_KEY='tms-flash-sales-revision'
export function notifyFlashSalesChanged(){
  useCart.setState({offerVerifiedUntil:0})
  try{localStorage.setItem(FLASH_CHANGE_KEY,String(Date.now()))}catch{}
  window.dispatchEvent(new Event(FLASH_CHANGE_EVENT))
}
