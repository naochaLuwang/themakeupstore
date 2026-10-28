const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const FCM_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/the-makeup-store-7dad3/messages:send'

// HTTP v1 wire format (different from the Firebase Admin SDK's camelCase fields).
function notificationPayload(title: string, body: string, url?: string) {
  return {
    notification: { title, body },
    android: {
      priority: 'HIGH',
      notification: {
        sound: 'default',
        notification_priority: 'PRIORITY_HIGH',
        default_sound: true,
        channel_id: 'push-notifications',
        icon: 'ic_stat_icon',
      },
    },
    ...(url ? { data: { url } } : {}),
  }
}

async function fcmError(response: Response) {
  const payload = await response.json().catch(() => ({}))
  const details = payload.error?.details as { '@type'?: string; errorCode?: string }[] | undefined
  const code = details?.find(detail =>
    detail['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError'
  )?.errorCode
  return {
    // A generic 404 can also mean a bad project/endpoint. Only delete tokens
    // when Firebase explicitly says the registration has expired.
    invalidToken: code === 'UNREGISTERED',
    message: `FCM send failed (${response.status}, ${code || payload.error?.status || 'UNKNOWN'}): ${payload.error?.message || 'Request rejected'}`,
  }
}

interface ServiceAccountKey {
  private_key: string
  client_email: string
  project_id: string
}

export function parseServiceAccountKey(rawValue: string | undefined | null): ServiceAccountKey {
  if (!rawValue) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set')

  let s = String(rawValue).trim()

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
    throw new Error('No JSON object found in FIREBASE_SERVICE_ACCOUNT_KEY')
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
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY parse failed: expected service account JSON with a valid private_key')
  }
}

// Cache the OAuth access token — minting one costs a JWT sign + HTTP roundtrip
let cachedAccessToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.value
  }

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

  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${encode(header)}.${encode(claim)}`

  const { createSign } = await import('node:crypto')
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

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(`FCM auth failed (${res.status}): ${data.error || 'no access token'}`)
  }

  cachedAccessToken = {
    value: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  }
  return cachedAccessToken.value
}

export async function sendFcmNotification(token: string, title: string, body: string, url?: string) {
  const accessToken = await getAccessToken()

  const message = { message: { token, ...notificationPayload(title, body, url) } }

  const res = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  })

  if (!res.ok) {
    throw new Error((await fcmError(res)).message)
  }

  return res.json()
}

export async function sendFcmToTopic(topic: string, title: string, body: string, url?: string) {
  const accessToken = await getAccessToken()

  const message = { message: { topic, ...notificationPayload(title, body, url) } }

  const res = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  })

  if (!res.ok) {
    throw new Error((await fcmError(res)).message)
  }

  return res.json()
}

export async function sendFcmMulticast(tokens: string[], title: string, body: string, url?: string) {
  // Same device can appear under multiple accounts — send once per token
  const uniqueTokens = [...new Set(tokens.filter(Boolean))]
  if (!uniqueTokens.length) return { sentCount: 0, invalidTokens: [], failedCount: 0 }
  const accessToken = await getAccessToken()
  const baseMessage = notificationPayload(title, body, url)

  const invalidTokens: string[] = []
  const errors: string[] = []
  let sentCount = 0
  const CHUNK_SIZE = 100

  for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
    const chunk = uniqueTokens.slice(i, i + CHUNK_SIZE)
    const results = await Promise.allSettled(
      chunk.map(token =>
        fetch(FCM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ message: { ...baseMessage, token } }),
        }).then(async r => {
          if (!r.ok) {
            const failure = await fcmError(r)
            if (failure.invalidToken) return { invalid: true, token }
            throw new Error(failure.message)
          }
          return { ok: true }
        })
      )
    )

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        if ('invalid' in r.value && r.value.invalid) {
          invalidTokens.push(r.value.token)
        } else if ('ok' in r.value) {
          sentCount++
        }
      } else if (r.status === 'rejected') {
        errors.push(r.reason instanceof Error ? r.reason.message : 'FCM request failed')
        console.error('[FCM] Send error:', r.reason)
      }
    }
  }

  if (!sentCount && errors.length) {
    throw new Error(errors[0])
  }
  return { sentCount, invalidTokens, failedCount: uniqueTokens.length - sentCount }
}
