const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const FCM_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/the-makeup-store-7dad3/messages:send'

export function parseServiceAccountKey(rawValue: string | undefined | null): any {
  if (!rawValue) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set')

  let s = String(rawValue).trim()

  const cands = new Set<string>()
  cands.add(s)

  // A) Strip JSON.stringify wrapper layers (outer "..." quotes)
  let inner = s
  for (let i = 0; i < 3; i++) {
    if (inner.startsWith('"') && inner.endsWith('"')) {
      inner = inner.slice(1, -1)
      cands.add(inner)
    } else break
  }

  // B) Strip escaped-quote wrapper \"...\" if present
  if (s.startsWith('\\"') && s.endsWith('\\"')) {
    cands.add(s.slice(2, -2))
  }

  // C) Unescape \" -> " (one layer)
  let un = s.replace(/\\"/g, '"')
  cands.add(un)
  // strip resulting surrounding quotes
  if (un.startsWith('"') && un.endsWith('"')) cands.add(un.slice(1, -1))
  if (un.startsWith('\\"') && un.endsWith('\\"')) cands.add(un.slice(2, -2))

  // D) For any candidate containing raw newline chars, add escaped variant
  for (const c of [...cands]) {
    if (c.includes('\n')) cands.add(c.replace(/\n/g, '\\n'))
  }

  // E) Strip \{ and \} wrappers (env vars set via shell escaping)
  for (const c of [...cands]) {
    let trimmed = c
    if (trimmed.startsWith('\\{')) trimmed = trimmed.slice(1)
    if (trimmed.endsWith('\\}')) trimmed = trimmed.slice(0, -1)
    if (trimmed !== c) cands.add(trimmed)
  }

  // F) Handle \{...\} wrapper with literal \n in private key
  for (const c of [...cands]) {
    if (c.startsWith('\\{') && c.endsWith('\\}')) {
      let stripped = c.slice(1, -1)
      cands.add(stripped)
      if (stripped.includes('\\n')) {
        cands.add(stripped.replace(/\\n/g, '\n'))
      }
    }
  }

  // G) Unescape remaining escaped characters within the string
  for (const c of [...cands]) {
    if (c.includes('\\')) {
      cands.add(c.replace(/\\{/g, '{').replace(/\\}/g, '}'))
    }
  }

  // Try each candidate; pick the one yielding a valid key with most newlines in pk
  let best: any = null
  for (const c of cands) {
    try {
      let parsed = JSON.parse(c)
      while (typeof parsed === 'string') parsed = JSON.parse(parsed)
      const pk = parsed && parsed.private_key
      if (typeof pk === 'string' && pk.includes('BEGIN PRIVATE KEY')) {
        const nl = (pk.match(/\n/g) || []).length
        if (!best || nl > best.nl) best = { parsed, nl }
      }
    } catch {}
  }
  if (best) return best.parsed

  throw new Error('Could not parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON')
}

async function getAccessToken(): Promise<string> {
  const key = parseServiceAccountKey(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  const { private_key, client_email } = key

  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: client_email,
    scope: FCM_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${encode(header)}.${encode(claim)}`

  const { KeyObject, createSign } = await import('node:crypto')
  const sign = createSign('RSA-SHA256')
  sign.update(jwt)
  const sig = sign.sign(private_key, 'base64')
  const assertion = `${jwt}.${sig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const data = await res.json()
  return data.access_token
}

export async function sendFcmNotification(token: string, title: string, body: string, url?: string) {
  const accessToken = await getAccessToken()

  const message: any = {
    message: {
      token,
      notification: { title, body },
      android: { priority: 'high', notification: { sound: 'default', priority: 'high', defaultSound: true, channel_id: 'push-notifications' } },
    },
  }

  if (url) {
    message.message.data = { url }
  }

  const res = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`FCM send failed: ${res.status} ${err}`)
  }

  return res.json()
}

export async function sendFcmMulticast(tokens: string[], title: string, body: string, url?: string) {
  const accessToken = await getAccessToken()

  const message: any = {
    message: {
      notification: { title, body },
      android: { priority: 'high', notification: { sound: 'default', priority: 'high', defaultSound: true, channel_id: 'push-notifications' } },
    },
  }

  if (url) {
    message.message.data = { url }
  }

  const results = await Promise.allSettled(
    tokens.map(token =>
      fetch(FCM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ...message, message: { ...message.message, token } }),
      }).then(async r => {
        if (!r.ok) {
          if (r.status === 404 || r.status === 410) return { invalid: true, token }
          throw new Error(`FCM error ${r.status}: ${await r.text()}`)
        }
        return { ok: true }
      })
    )
  )

  const invalidTokens: string[] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value && 'invalid' in r.value && r.value.invalid) {
      invalidTokens.push((r.value as any).token)
    }
  }

  return {
    sentCount: results.filter(r =>
      r.status === 'fulfilled' && r.value && 'ok' in r.value
    ).length,
    invalidTokens
  }
}
