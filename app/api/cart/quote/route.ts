import { NextResponse } from 'next/server'
import { getOfferQuote, getPromotionPreview } from '@/app/actions/offer-quote'

// Read-only POST avoids putting baskets in URLs or shared caches. Guests are supported.
export async function POST(request: Request) {
  const started = performance.now()
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
  try {
    const body = await request.json()
    const result = Array.isArray(body) && body.length === 0 ? await getPromotionPreview() : await getOfferQuote(body)
    return NextResponse.json(result, { status: result.success ? 200 : 400,
      headers: { ...headers, 'Server-Timing': `offers;dur=${(performance.now() - started).toFixed(1)}` } })
  } catch {
    return NextResponse.json({ success: false, message: 'Could not check offers. Please try again.' }, { status: 400, headers })
  }
}
