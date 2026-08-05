const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const FCM_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/the-makeup-store-7dad3/messages:send'

async function getAccessToken(): Promise<string> {
  let keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!keyJson) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set')

  keyJson = keyJson.trim()
  if (keyJson.startsWith('"') && keyJson.endsWith('"')) keyJson = keyJson.slice(1, -1)
  keyJson = keyJson.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')

  const key = JSON.parse(keyJson)
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
      android: { priority: 'high', notification: { sound: 'default', priority: 'high', defaultSound: true } },
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
      android: { priority: 'high', notification: { sound: 'default', priority: 'high', defaultSound: true } },
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
