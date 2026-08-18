const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const FCM_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/the-makeup-store-7dad3/messages:send'

export function parseServiceAccountKey(rawValue: string | undefined | null): any {
  if (!rawValue) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set')

  let s = String(rawValue).trim()

  // Log for debugging (remove in production)
  console.log('[FCM_PARSER] Input length:', s.length)
  console.log('[FCM_PARSER] First 50 chars:', s.substring(0, 50))
  console.log('[FCM_PARSER] Last 50 chars:', s.substring(s.length - 50))

  // Step 1: Strip any \{ \} wrappers (Hostinger adds these)
  if (s.startsWith('\\{')) s = s.substring(1)
  if (s.endsWith('\\}')) s = s.substring(0, s.length - 1)

  // Step 2: Strip regular { } if they're escaped at boundaries
  // Hostinger may store: \{"type":...\}
  s = s.trim()

  // Step 3: Find JSON boundaries
  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`No JSON object found. First 100 chars: ${s.substring(0, 100)}`)
  }
  s = s.substring(firstBrace, lastBrace + 1)

  // Step 4: Handle newline escaping
  // The private_key should have \n as literal two-char sequences in JSON
  // But env vars may have: \\n (double escaped) or actual newlines

  // If there are actual newlines in the string, we need to escape them for JSON
  if (s.includes('\n') && !s.includes('\\n')) {
    s = s.replace(/\n/g, '\\n')
  }

  // If there are double-escaped newlines (\\\\n), reduce to single-escaped (\\n)
  if (s.includes('\\\\n')) {
    s = s.replace(/\\\\n/g, '\\n')
  }

  // Step 5: Try parsing
  try {
    const parsed = JSON.parse(s)
    if (parsed && typeof parsed.private_key === 'string' && parsed.private_key.includes('BEGIN PRIVATE KEY')) {
      // Ensure private_key has proper newlines
      if (parsed.private_key.includes('\\n') && !parsed.private_key.includes('\n')) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
      }
      return parsed
    }
    throw new Error('Parsed JSON but missing valid private_key')
  } catch (e: any) {
    throw new Error(`JSON parse failed: ${e.message}. Input starts with: ${s.substring(0, 100)}`)
  }
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

export async function sendFcmToTopic(topic: string, title: string, body: string, url?: string) {
  const accessToken = await getAccessToken()

  const message: any = {
    message: {
      topic,
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
    throw new Error(`FCM topic send failed: ${res.status} ${err}`)
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
