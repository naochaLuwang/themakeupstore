import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const results: any = {}

        // Step 1: Check env var exists
        let keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        if (!keyJson) {
            return NextResponse.json({ error: "FIREBASE_SERVICE_ACCOUNT_KEY not set in environment" }, { status: 500 })
        }
        results.envVarLength = keyJson.length
        results.envVarStartsWith = keyJson.trim().substring(0, 20)

        // Step 2: Parse the key
        keyJson = keyJson.trim()
        if (keyJson.startsWith('"') && keyJson.endsWith('"')) keyJson = keyJson.slice(1, -1)
        keyJson = keyJson.replace(/\n/g, '\\n')

        let key: any
        try {
            key = JSON.parse(keyJson)
            results.parsed = true
            results.projectId = key.project_id
            results.clientEmail = key.client_email
            results.hasPrivateKey = !!key.private_key
            results.privateKeyStartsWith = key.private_key?.substring(0, 30)
            results.privateKeyEndsWith = key.private_key?.substring(key.private_key.length - 30)
            results.newlineCount = (key.private_key.match(/\n/g) || []).length
        } catch (e: any) {
            return NextResponse.json({ error: "JSON parse failed", detail: e.message }, { status: 500 })
        }

        // Step 3: Try to sign JWT and get access token
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
                    status: tokenRes.status,
                    detail: tokenData
                }, { status: 500 })
            }
            accessToken = tokenData.access_token
            results.tokenObtained = true
            results.tokenPrefix = accessToken.substring(0, 20)
        } catch (e: any) {
            return NextResponse.json({ error: "JWT signing failed", detail: e.message }, { status: 500 })
        }

        // Step 4: Find user's subscriptions (FCM or Web Push)
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('id, fcm_token, subscription_json, platform')
            .eq('user_id', user.id)

        const fcmTokens = (subs || []).filter(s => s.fcm_token).map(s => s.fcm_token!)
        const webPushSubs = (subs || []).filter(s => s.subscription_json && !s.fcm_token)

        results.totalSubs = subs?.length || 0
        results.fcmTokens = fcmTokens.length
        results.webPushSubs = webPushSubs.length

        // Step 5a: Send via FCM
        if (fcmTokens.length > 0) {
            const FCM_ENDPOINT_URL = `https://fcm.googleapis.com/v1/projects/the-makeup-store-7dad3/messages:send`
            const message = {
                message: {
                    token: fcmTokens[0],
                    notification: { title: "Test Notification", body: "FCM is working!" },
                    android: { priority: 'high' },
                }
            }
            const fcmRes = await fetch(FCM_ENDPOINT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(message),
            })
            const fcmBody = await fcmRes.text()
            results.fcmStatus = fcmRes.status
            results.fcmResponse = fcmBody.substring(0, 300)
            if (!fcmRes.ok) {
                return NextResponse.json({ ...results, error: "FCM send failed", step: "fcm_send_failed" }, { status: 500 })
            }
            return NextResponse.json({ ...results, success: true, step: "fcm_sent", message: `Test sent via FCM to ${fcmTokens.length} device(s)` })
        }

        // Step 5b: Send via Web Push
        if (webPushSubs.length > 0) {
            try {
                const webpush = (await import("web-push")).default
                const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || ""
                const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || ""
                webpush.setVapidDetails('mailto:admin@themakeupstorewangkhei.com', publicKey, privateKey)

                const payload = JSON.stringify({ title: "Test Notification", body: "Web Push is working!", url: "/" })
                let sent = 0
                for (const sub of webPushSubs) {
                    try {
                        const subObj = typeof sub.subscription_json === 'string'
                            ? JSON.parse(sub.subscription_json)
                            : sub.subscription_json
                        await webpush.sendNotification(subObj, payload)
                        sent++
                    } catch (err: any) {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                        }
                    }
                }
                return NextResponse.json({ ...results, success: true, step: "webpush_sent", message: `Test sent via Web Push to ${sent} browser(s)` })
            } catch (e: any) {
                return NextResponse.json({ ...results, error: "Web Push failed", detail: e.message, step: "webpush_failed" }, { status: 500 })
            }
        }

        return NextResponse.json({ ...results, warning: "No push subscriptions found. Click 'Register This Browser' first.", success: true, step: "no_subs" })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
