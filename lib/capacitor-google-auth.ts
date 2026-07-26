import { GoogleOneTapAuth } from 'capacitor-native-google-one-tap-signin'

const WEB_CLIENT_ID = '127502531027-mqjrtvqavbgaf28dneq8uf2rjpvrqhuj.apps.googleusercontent.com'

let initialized = false
let currentNonce: string | null = null

function generateNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function initGoogleAuth() {
  if (initialized) return
  currentNonce = generateNonce()
  await GoogleOneTapAuth.initialize({ clientId: WEB_CLIENT_ID, nonce: currentNonce })
  initialized = true
}

export async function nativeGoogleSignIn(): Promise<{ idToken: string; email: string; name?: string; nonce: string } | null> {
  await initGoogleAuth()

  const result = await GoogleOneTapAuth.signInWithGoogleButtonFlowForNativePlatform()
  if (result.isSuccess && result.success) {
    return {
      idToken: result.success.idToken,
      email: result.success.email,
      name: result.success.decodedIdToken?.name,
      nonce: currentNonce!,
    }
  }

  return null
}

export async function nativeGoogleSignOut() {
  await GoogleOneTapAuth.signOut()
}