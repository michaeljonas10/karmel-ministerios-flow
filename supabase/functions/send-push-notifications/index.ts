import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_SUBJECT = 'mailto:contato@pulseминистериос.app'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── VAPID JWT helpers ───────────────────────────────────────────────────────

function base64UrlDecode(str: string): Uint8Array {
  const padded = str + '='.repeat((4 - str.length % 4) % 4)
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return Uint8Array.from([...bin].map(c => c.charCodeAt(0)))
}

function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function importPrivateKey(b64url: string): Promise<CryptoKey> {
  const raw = base64UrlDecode(b64url)
  return crypto.subtle.importKey(
    'raw', raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, ['deriveKey', 'deriveBits']
  )
}

async function buildVapidJwt(audience: string): Promise<string> {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })))
  const signingInput = `${header}.${payload}`

  const keyBytes = base64UrlDecode(VAPID_PRIVATE_KEY)
  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    key,
    new TextEncoder().encode(signingInput)
  )
  return `${signingInput}.${base64UrlEncode(sig)}`
}

// ── ECDH + AES-GCM encryption (RFC 8291) ──────────────────────────────────

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string,
): Promise<{ body: Uint8Array; headers: Record<string, string> }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  ) as CryptoKeyPair

  const serverPubRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  const clientPubRaw = base64UrlDecode(p256dh)
  const authSecret = base64UrlDecode(auth)

  const clientPub = await crypto.subtle.importKey(
    'raw', clientPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPub }, serverKeyPair.privateKey, 256
  )

  // HKDF to derive IKM
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits'])
  const prk = new Uint8Array(await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: authSecret,
      info: concat(label('Content-Encoding: auth\0'), new Uint8Array(1)),
    },
    hkdfKey, 256
  ))

  const contentKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits'])
  const keyInfo = concat(label('Content-Encoding: aesgcm\0'), new Uint8Array(1), u16(clientPubRaw.length), clientPubRaw, u16(serverPubRaw.byteLength), new Uint8Array(serverPubRaw))
  const nonceInfo = concat(label('Content-Encoding: nonce\0'), new Uint8Array(1), u16(clientPubRaw.length), clientPubRaw, u16(serverPubRaw.byteLength), new Uint8Array(serverPubRaw))

  const encKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, contentKey, 128),
    'AES-GCM', false, ['encrypt']
  )
  const nonce = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, contentKey, 96))

  const padded = concat(new Uint8Array(2), new TextEncoder().encode(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, encKey, padded)

  const body = concat(salt, u32(4096), u8(serverPubRaw.byteLength), new Uint8Array(serverPubRaw), new Uint8Array(ciphertext))

  return {
    body,
    headers: {
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${base64UrlEncode(salt.buffer)}`,
      'Crypto-Key': `dh=${base64UrlEncode(serverPubRaw)}`,
    },
  }
}

function label(s: string) { return new TextEncoder().encode(s) }
function u8(n: number) { return new Uint8Array([n]) }
function u16(n: number) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n); return b }
function u32(n: number) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
function concat(...arrays: Uint8Array[]) {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrays) { out.set(a, off); off += a.length }
  return out
}

// ── Send a single push ─────────────────────────────────────────────────────

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, notification: object) {
  const url = new URL(sub.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await buildVapidJwt(audience)
  const vapidKey = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`

  const { body, headers: encHeaders } = await encryptPayload(JSON.stringify(notification), sub.p256dh, sub.auth)

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidKey,
      'Content-Type': 'application/octet-stream',
      'Content-Length': body.length.toString(),
      'TTL': '86400',
      ...encHeaders,
    },
    body,
  })
  return res.status
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Allow cron or admin calls
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.includes('Bearer')) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Find volunteers waiting 7+ days (no contact update in last 7 days, status not established)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const { data: overdue } = await supabase
    .from('volunteers')
    .select('id, name, ministry_id')
    .is('archived_at', null)
    .neq('journey_status', 'estabelecido')
    .or(`updated_at.lte.${sevenDaysAgo},updated_at.is.null`)
    .limit(100)

  if (!overdue || overdue.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no overdue volunteers' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get all push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no subscriptions' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const notification = {
    title: 'Pulse Ministérios',
    body: `${overdue.length} voluntário${overdue.length !== 1 ? 's' : ''} aguardando acompanhamento`,
    tag: 'overdue-followup',
    url: '/dashboard',
  }

  let sent = 0
  const stale: string[] = []

  for (const sub of subscriptions) {
    try {
      const status = await sendPush(sub, notification)
      if (status === 201 || status === 200) {
        sent++
      } else if (status === 410 || status === 404) {
        stale.push(sub.endpoint)
      }
    } catch {
      // ignore individual send errors
    }
  }

  // Remove stale subscriptions
  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', stale)
  }

  return new Response(JSON.stringify({ sent, overdueCount: overdue.length, removedStale: stale.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
