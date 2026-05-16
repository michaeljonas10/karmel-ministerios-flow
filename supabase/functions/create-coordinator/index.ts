import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { name, email, password, role, ministry_id, sub_areas } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: { user: caller } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: callerProfile } = await supabase
      .from('user_profiles').select('role,ministry_id').eq('id', caller.id).single()

    const isAdmin = callerProfile?.role === 'admin'
    const isLeader = callerProfile?.role === 'ministry_leader'

    if (!isAdmin && !isLeader) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    // Leaders can only create coordinators for their own ministry
    const targetRole = isAdmin ? (role || 'coordinator') : 'coordinator'
    const targetMinistry = isAdmin ? ministry_id : callerProfile?.ministry_id

    if (!targetMinistry) {
      return new Response(JSON.stringify({ error: 'Ministério obrigatório' }), { status: 400, headers: corsHeaders })
    }

    if (isLeader && targetMinistry !== callerProfile?.ministry_id) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: corsHeaders })
    }

    // Create auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: targetRole }
    })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })

    // Set profile
    await supabase.from('user_profiles').upsert({
      id: data.user.id,
      email,
      name,
      role: targetRole,
      ministry_id: targetMinistry,
      sub_areas: sub_areas ?? [],
    })

    return new Response(
      JSON.stringify({ success: true, userId: data.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
