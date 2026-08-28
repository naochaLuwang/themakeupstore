import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const results: any = {}

        const keyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        if (!keyRaw) {
            return NextResponse.json({ error: "FIREBASE_SERVICE_ACCOUNT_KEY not set", step: "env_missing" }, { status: 200 })
        }
        results.envVarLength = keyRaw.length
        results.envVarStartsWith = keyRaw.trim().substring(0, 30)
        results.envVarEndsWith = keyRaw.trim().substring(keyRaw.trim().length - 30)
        results.parserVersion = 3

        let key: any
        try {
            const { parseServiceAccountKey } = await import("@/lib/fcm-send")
            key = parseServiceAccountKey(keyRaw)
            results.parsed = true
            results.projectId = key.project_id
            results.clientEmail = key.client_email
            results.hasPrivateKey = !!key.private_key
            results.privateKeyLength = key.private_key?.length
            results.newlineCount = (key.private_key.match(/\n/g) || []).length
        } catch (e: any) {
            return NextResponse.json({
                error: "JSON parse failed",
                step: "json_parse",
                detail: e.message,
                results,
            }, { status: 200 })
        }

        const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
        const header = { alg: 'RS256', typ: 'JWT' }
        const now = Math.floor(Date.now() / 1000)
        const claim = {
            iss: key.client_email,
            scope: FCM_SCOPE,
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now,
        }

        const encode = (obj: any) =>
            btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

        const jwtStr = `${encode(header)}.${encode(claim)}`

        let accessToken: string
        try {
            const { createSign } = await import('node:crypto')
            const sign = createSign('RSA-SHA256')
            sign.update(jwtStr)
            const sig = sign.sign(key.private_key, 'base64')
            const assertion = `${jwtStr}.${sig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`

            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion,
                }),
            })

            const tokenData = await tokenRes.json()
            if (!tokenData.access_token) {
                return NextResponse.json({
                    error: "Failed to get access token",
                    step: "token_exchange",
                    detail: JSON.stringify(tokenData),
                    status: tokenRes.status,
                }, { status: 200 })
            }
            accessToken = tokenData.access_token
            results.tokenObtained = true
            results.tokenPrefix = accessToken.substring(0, 20)
        } catch (e: any) {
            return NextResponse.json({ error: "JWT signing failed", step: "jwt_signing", detail: e.message }, { status: 200 })
        }

        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('fcm_token')
            .not('fcm_token', 'is', null)

        const fcmTokens = (subs || []).filter(s => s.fcm_token).map(s => s.fcm_token!)
        results.fcmTokens = fcmTokens.length

        if (fcmTokens.length === 0) {
            return NextResponse.json({ ...results, warning: "No FCM tokens found. Install the app and log in to register.", success: true, step: "no_fcm_tokens" })
        }

        // Fan out to EVERY registered token so the admin's own device gets it too.
        const { sendFcmMulticast } = await import('@/lib/fcm-send')
        const result = await sendFcmMulticast(fcmTokens, "Test Notification", "FCM is working!", "/")

        let staleRemoved = 0
        for (const token of result.invalidTokens) {
            await supabase.from('push_subscriptions').delete().eq('fcm_token', token)
            staleRemoved++
        }

        results.sentCount = result.sentCount
        results.staleRemoved = staleRemoved

        return NextResponse.json({
            ...results,
            success: true,
            step: "fcm_sent",
            message: `Test notification sent to ${result.sentCount} of ${fcmTokens.length} device(s)${staleRemoved ? ` · ${staleRemoved} stale token(s) removed` : ""}`,
            warning: result.sentCount === 0 ? "FCM returned no failures but nothing was delivered — check the app side." : undefined,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message, step: "unknown" }, { status: 200 })
    }
}
