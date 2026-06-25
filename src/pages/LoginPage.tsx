import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scissors, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// -------------------------------------------------------
// Schema de validação
// -------------------------------------------------------

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Por favor, preencha o e-mail.')
    .email('O e-mail digitado não é válido.'),
  password: z
    .string()
    .min(1, 'Por favor, preencha a senha.'),
})

type LoginForm = z.infer<typeof loginSchema>

// -------------------------------------------------------
// Página de Login
// -------------------------------------------------------

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setAuthError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setAuthError(error)
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto bg-purple-100 text-purple-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
            <Scissors size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Oficina da Roupa</h1>
          <p className="text-gray-500 mt-2 text-lg">Acesso restrito para funcionários</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Campo E-mail */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-base font-semibold text-gray-700"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className={[
                  'w-full h-14 px-4 rounded-xl border text-base text-gray-800 bg-white',
                  'focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent',
                  'placeholder:text-gray-400 transition-colors',
                  errors.email
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300',
                ].join(' ')}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Campo Senha */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-base font-semibold text-gray-700"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={[
                    'w-full h-14 px-4 pr-12 rounded-xl border text-base text-gray-800 bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent',
                    'placeholder:text-gray-400 transition-colors',
                    errors.password
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300',
                  ].join(' ')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Erro de autenticação */}
            {authError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm font-medium text-red-700">{authError}</p>
              </div>
            )}

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={[
                'w-full h-14 rounded-xl font-semibold text-lg text-white transition-all',
                'flex items-center justify-center gap-2',
                isSubmitting
                  ? 'bg-purple-700 cursor-not-allowed opacity-75'
                  : 'bg-purple-900 hover:bg-purple-800 active:scale-95 shadow-md hover:shadow-lg',
              ].join(' ')}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Acesso somente para usuários cadastrados
        </p>
      </div>
    </div>
  )
}
