import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://fzbxzcwopgwsojxmckpa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Ynh6Y3dvcGd3c29qeG1ja3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg3Nzc0NSwiZXhwIjoyMDk0NDUzNzQ1fQ.GM8x2sVslJ1TeWNmBZUopQqa8GdMpLzHNBLLvEJ3S0M',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // Create admin user
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@karmel.com.br',
    password: 'Admin@2026!',
    email_confirm: true,
    user_metadata: { name: 'Administrador', role: 'admin' }
  })

  if (error) { console.error('Error creating admin:', error); return }
  console.log('Admin created:', data.user?.id)

  // Update profile role to admin explicitly
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: data.user!.id,
      email: 'admin@karmel.com.br',
      name: 'Administrador',
      role: 'admin',
      ministry_id: null
    })

  if (profileError) console.error('Profile error:', profileError)
  else console.log('Admin profile set. Done!')
}

main()
