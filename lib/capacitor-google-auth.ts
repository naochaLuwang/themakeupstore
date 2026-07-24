import { GoogleOneTapAuth } from 'capacitor-native-google-one-tap-signin'

const WEB_CLIENT_ID = '127502531027-mqjrtvqavbgaf28dneq8uf2rjpvrqhuj.apps.googleusercontent.com'

let initialized = false

export async function initGoogleAuth() {
  if (initialized) return
  await GoogleOneTapAuth.initialize({ clientId: WEB_CLIENT_ID })
  initialized = true
}

export async function nativeGoogleSignIn(): Promise<{ idToken: string; email: string; name?: string } | null> {
  await initGoogleAuth()

  const result = await GoogleOneTapAuth.tryAutoOrOneTapSignIn()
  if (result.isSuccess && result.success) {
    return {
      idToken: result.success.idToken,
      email: result.success.email,
      name: result.success.decodedIdToken?.name,
    }
  }

  const btnResult = await GoogleOneTapAuth.signInWithGoogleButtonFlowForNativePlatform()
  if (btnResult.isSuccess && btnResult.success) {
    return {
      idToken: btnResult.success.idToken,
      email: btnResult.success.email,
      name: btnResult.success.decodedIdToken?.name,
    }
  }

  return null
}

export async function nativeGoogleSignOut() {
  await GoogleOneTapAuth.signOut()
}
