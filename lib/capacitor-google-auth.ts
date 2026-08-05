import { GoogleOneTapAuth } from 'capacitor-native-google-one-tap-signin'

const WEB_CLIENT_ID = '127502531027-mqjrtvqavbgaf28dneq8uf2rjpvrqhuj.apps.googleusercontent.com'

let rawNonce: string | null = null

function generateNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function hashNonce(nonce: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(nonce)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function initGoogleAuth() {
  rawNonce = generateNonce()
  const hashedNonce = await hashNonce(rawNonce)
  await GoogleOneTapAuth.initialize({ clientId: WEB_CLIENT_ID, nonce: hashedNonce })
}

export async function nativeGoogleSignIn(): Promise<{ idToken: string; email: string; name?: string; nonce: string } | null> {
  await initGoogleAuth()

  try {
    const result = await GoogleOneTapAuth.signInWithGoogleButtonFlowForNativePlatform()
    console.log('Google sign-in result:', JSON.stringify(result))
    if (result.isSuccess && result.success) {
      return {
        idToken: result.success.idToken,
        email: result.success.email,
        name: result.success.decodedIdToken?.name,
        nonce: rawNonce!,
      }
    }
    console.error('Google sign-in not successful:', JSON.stringify(result))
  } catch (err: any) {
    console.error('Google sign-in error:', err?.message || err)
  }

  return null
}

export async function nativeGoogleSignOut() {
  await GoogleOneTapAuth.signOut()
}