import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { UserProfile } from '@/types/database'

// -------------------------------------------------------
// Tipos do contexto
// -------------------------------------------------------

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// -------------------------------------------------------
// Criação do contexto
// -------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null)

// -------------------------------------------------------
// Provider
// -------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Busca o perfil do usuário na tabela users_profiles
  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('users_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Erro ao carregar perfil:', error.message)
      setProfile(null)
    } else {
      setProfile(data as UserProfile)
    }
  }

  // Escuta mudanças de sessão do Supabase Auth
  useEffect(() => {
    // Carrega sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Inscreve para mudanças futuras
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // -------------------------------------------------------
  // Ações
  // -------------------------------------------------------

  async function signIn(
    email: string,
    password: string
  ): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error: 'E-mail ou senha incorretos. Tente novamente.' }
    }

    // Após login, busca o perfil para checar se está ativo
    const { data: profileData } = await supabase
      .from('users_profiles')
      .select('is_active')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profileData && profileData.is_active === false) {
      await supabase.auth.signOut()
      return { error: 'Sua conta está desativada. Entre em contato com o administrador.' }
    }

    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// -------------------------------------------------------
// Hook
// -------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return ctx
}
