import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'ministry_leader' | 'coordinator'
  ministry_id: string | null
  sub_areas: string[]
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isLeader: boolean
  isCoordinator: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (data: { name?: string; email?: string; password?: string; avatar_url?: string }) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | null>(null)

const INACTIVITY_TIMEOUT = 14400000 // 4 hours in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile({ sub_areas: [], ...data } as UserProfile)
  }

  useEffect(() => {
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        supabase.auth.signOut()
        setProfile(null)
      }, INACTIVITY_TIMEOUT)
    }

    const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart'] as const
    activityEvents.forEach(event => document.addEventListener(event, resetInactivityTimer, { passive: true }))
    resetInactivityTimer()

    let profileChannel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))

        // Subscribe to real-time updates for this user's profile row so that
        // sub-area assignments (made by admins) are reflected immediately
        // without requiring a re-login.
        profileChannel = supabase
          .channel(`my-profile-${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_profiles',
              filter: `id=eq.${session.user.id}`,
            },
            () => fetchProfile(session.user.id)
          )
          .subscribe()
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        if (event === 'SIGNED_IN') {
          // fire-and-forget: SECURITY DEFINER fn faz o lookup do perfil internamente
          supabase.rpc('log_user_login', {
            p_user_id: session.user.id,
            p_user_email: session.user.email ?? null,
          }).then(({ error }) => {
            if (error) console.warn('[login_log] erro ao registrar acesso:', error.message)
          })
        }
      } else {
        setProfile(null)
        if (profileChannel) {
          supabase.removeChannel(profileChannel)
          profileChannel = null
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      if (profileChannel) supabase.removeChannel(profileChannel)
      if (inactivityTimer) clearTimeout(inactivityTimer)
      activityEvents.forEach(event => document.removeEventListener(event, resetInactivityTimer))
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const updateProfile = async (data: { name?: string; email?: string; password?: string; avatar_url?: string }) => {
    if (!user) return { error: 'Not authenticated' }

    // Update auth email/password if provided
    const authUpdates: { email?: string; password?: string } = {}
    if (data.email) authUpdates.email = data.email
    if (data.password) authUpdates.password = data.password

    if (Object.keys(authUpdates).length > 0) {
      const { error } = await supabase.auth.updateUser(authUpdates)
      if (error) return { error: error.message }
    }

    // Update user_profiles row
    const profileUpdates: { name?: string; email?: string; avatar_url?: string } = {}
    if (data.name) profileUpdates.name = data.name
    if (data.email) profileUpdates.email = data.email
    if (data.avatar_url !== undefined) profileUpdates.avatar_url = data.avatar_url

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase.from('user_profiles').update(profileUpdates).eq('id', user.id)
      if (error) return { error: error.message }
      setProfile(prev => prev ? { ...prev, ...profileUpdates } : prev)
    }

    return { error: null }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isSuperAdmin: profile?.role === 'super_admin',
      isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
      isLeader: profile?.role === 'ministry_leader',
      isCoordinator: profile?.role === 'coordinator',
      signIn,
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
