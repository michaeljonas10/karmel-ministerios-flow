import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'ministry_leader' | 'coordinator'
  ministry_id: string | null
  sub_areas: string[]
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  isLeader: boolean
  isCoordinator: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (data: { name?: string; email?: string; password?: string; avatar_url?: string }) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | null>(null)

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
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
      isAdmin: profile?.role === 'admin',
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
