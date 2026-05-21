import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  // Only allow super_admin or service-role calls
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.includes('Bearer')) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Read auth.audit_log_entries via SECURITY DEFINER function (service_role only)
  const { data: auditRows, error: auditErr } = await supabase.rpc('get_login_audit_entries')

  if (auditErr) {
    return new Response(JSON.stringify({ error: auditErr.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!auditRows || auditRows.length === 0) {
    return new Response(JSON.stringify({ inserted: 0, message: 'no audit rows found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch all user profiles for name/role lookup
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, name, email, role')

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // Fetch existing log entries to avoid duplicates
  // (match on user_id + minute-level timestamp)
  const { data: existing } = await supabase
    .from('login_log')
    .select('user_id, logged_in_at')

  const existingSet = new Set(
    (existing ?? []).map(e => `${e.user_id}_${e.logged_in_at.substring(0, 16)}`)
  )

  const toInsert = []
  for (const row of auditRows) {
    const payload = row.payload as Record<string, string>
    const userId = payload.actor_id
    if (!userId) continue

    const key = `${userId}_${row.created_at.substring(0, 16)}`
    if (existingSet.has(key)) continue

    const profile = profileMap.get(userId)
    toInsert.push({
      user_id: userId,
      user_name: profile?.name ?? null,
      user_email: profile?.email ?? payload.actor_username ?? null,
      user_role: profile?.role ?? null,
      logged_in_at: row.created_at,
    })
  }

  if (toInsert.length === 0) {
    return new Response(JSON.stringify({ inserted: 0, message: 'all already imported' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error: insertErr } = await supabase.from('login_log').insert(toInsert)

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ inserted: toInsert.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
