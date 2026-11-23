'use client'
import Link from 'next/link'
import { rememberReturnPath } from '@/lib/storefront-navigation'
export function SignInLink({ className }: { className?: string }) {
  const remember = () => rememberReturnPath(location.pathname + location.search)
  return <Link href="/login" className={className} onClick={remember} onAuxClick={remember}>Login</Link>
}
