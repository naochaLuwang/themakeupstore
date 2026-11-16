export type RecoveryMessage = {
  email: string; userName: string; itemCount: number; itemNames: string; recoveryKey: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function recoveryPayload(message: RecoveryMessage) {
  const name = escapeHtml(message.userName)
  const names = escapeHtml(message.itemNames)
  return {
    from: 'The Makeup Store Wangkhei <no-reply@themakeupstorewangkhei.com>',
    to: [message.email], subject: `Complete your order, ${message.userName} 🛍️`,
    html: `<div style="background:#000;color:#fff;font-family:Arial,sans-serif;padding:48px 20px;text-align:center">
      <div style="max-width:500px;margin:auto">
        <h1 style="font-size:14px;letter-spacing:4px;font-weight:400">The Makeup Store</h1>
        <p style="color:#aaa;font-size:12px;margin-top:40px">You left something behind</p>
        <h2 style="font-size:22px;font-weight:400">Hey ${name}, your bag is waiting!</h2>
        <p style="font-size:14px;color:#bbb;line-height:1.8">You have <strong style="color:#fff">${message.itemCount} item${message.itemCount !== 1 ? 's' : ''}</strong> in your cart.
        ${names ? `<br>${names}` : ''}<br>Complete your purchase before they sell out.</p>
        <p style="margin:36px 0"><a href="https://themakeupstorewangkhei.com/cart" style="display:inline-block;background:#fff;color:#000;padding:16px 30px;text-decoration:none;font-size:13px;font-weight:bold">Return to cart</a></p>
        <p style="font-size:11px;color:#888;border-top:1px solid #333;padding-top:24px">Wangkhei, Manipur<br>You received this because you saved items to your cart but didn't complete checkout.</p>
      </div></div>`,
  }
}

export async function sendCartRecoveryEmail(message: RecoveryMessage, apiKey: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'Idempotency-Key': message.recoveryKey },
    body: JSON.stringify(recoveryPayload(message)), signal: AbortSignal.timeout(15_000),
  })
}

export function createRecoveryHandler(config: { serviceKey?: string; apiKey?: string }) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
    if (!config.serviceKey || !config.apiKey) return new Response('Email service is not configured', { status: 503 })
    if (request.headers.get('authorization') !== `Bearer ${config.serviceKey}`) return new Response('Unauthorized', { status: 401 })
    try {
      const body = await request.text()
      if (body.length > 10_000) return new Response('Invalid message', { status: 400 })
      const message = JSON.parse(body) as RecoveryMessage
      if (!message || typeof message.email !== 'string' || message.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email) ||
        typeof message.userName !== 'string' || !message.userName.trim() || message.userName.length > 200 ||
        typeof message.itemNames !== 'string' || message.itemNames.length > 2_000 ||
        !Number.isSafeInteger(message.itemCount) || message.itemCount <= 0 ||
        typeof message.recoveryKey !== 'string' || !/^(cart-recovery|live-cart)\/[0-9a-f-]{36}(\/[0-9T:.Z+-]{1,40})?$/i.test(message.recoveryKey)) {
        return new Response('Invalid message', { status: 400 })
      }
      const response = await sendCartRecoveryEmail(message, config.apiKey)
      if (!response.ok) {
        console.error('[Cart recovery] Email provider rejected request', { status: response.status })
        return new Response('Email provider did not accept the request', { status: response.status >= 500 ? 502 : response.status })
      }
      return new Response('OK', { status: 200 })
    } catch (error) {
      if (error instanceof SyntaxError) return new Response('Invalid message', { status: 400 })
      return new Response('Email request could not be confirmed', { status: 503 })
    }
  }
}
