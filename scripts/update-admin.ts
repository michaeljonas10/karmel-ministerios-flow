import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://fzbxzcwopgwsojxmckpa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Ynh6Y3dvcGd3c29qeG1ja3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg3Nzc0NSwiZXhwIjoyMDk0NDUzNzQ1fQ.GM8x2sVslJ1TeWNmBZUopQqa8GdMpLzHNBLLvEJ3S0M',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // Find existing admin user
  const { data: users } = await supabase.auth.admin.listUsers()
  const admin = users?.users?.find(u => u.email === 'admin@karmel.com.br')
  if (!admin) { console.error('Admin not found'); return }
  
  // Update email + password
  const { data, error } = await supabase.auth.admin.updateUserById(admin.id, {
    email: 'michaeljonas@live.com',
    password: '123456',
    email_confirm: true,
  })
  if (error) { console.error('Update error:', error); return }
  
  // Update profile email
  await supabase.from('user_profiles').update({ email: 'michaeljonas@live.com' }).eq('id', admin.id)
  
  console.log('Done! New email:', data.user?.email)
}
main()
