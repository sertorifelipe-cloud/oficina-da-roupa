import { useState, useEffect, useCallback } from 'react'
import { Shield, UserCog, User, Key, Save, Loader2, AlertTriangle, ShieldOff } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import * as Dialog from '@radix-ui/react-dialog'

interface UserProfile {
  id: string
  name: string
  role: 'admin' | 'operador' | 'vendedor' | 'costureiro'
  is_active: boolean
}

export function ConfiguracoesPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Estados Minha Conta
  const [myName, setMyName] = useState(profile?.name || '')
  const [isSavingName, setIsSavingName] = useState(false)
  const [isResettingPass, setIsResettingPass] = useState(false)

  // Estados Gerenciamento
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null)
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)
  const [userToBlock, setUserToBlock] = useState<UserProfile | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      // is_active ainda não existe no schema initial_schema, mas vamos fingir que adicionamos se precisássemos, 
      // ou apenas omitir por enquanto, já que RLS bloqueia deleção.
      // Vamos focar no role.
      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .order('name')
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Erro ao buscar usuários:', err)
      toast.error('Não foi possível carregar a lista de usuários.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers()
    }
    if (profile) {
      setMyName(profile.name)
    }
  }, [profile, fetchUsers])

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myName.trim()) return toast.error('O nome não pode ficar vazio.')
    if (myName === profile?.name) return

    setIsSavingName(true)
    try {
      const { error } = await supabase
        .from('users_profiles')
        .update({ name: myName })
        .eq('id', profile!.id)
      
      if (error) throw error
      toast.success('Nome atualizado com sucesso! Pode demorar um segundo para refletir na tela toda.')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar nome.')
    } finally {
      setIsSavingName(false)
    }
  }

  const handleResetPassword = async () => {
    setIsResettingPass(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw error
        toast.success(`E-mail de redefinição enviado para ${user.email}`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao solicitar redefinição. Verifique se seu e-mail é válido no Supabase.')
    } finally {
      setIsResettingPass(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: UserProfile['role']) => {
    setIsUpdatingRole(true)
    try {
      const { error } = await supabase
        .from('users_profiles')
        .update({ role: newRole })
        .eq('id', userId)
      
      if (error) throw error
      toast.success('Perfil de acesso atualizado!')
      fetchUsers()
      setUserToEdit(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao alterar perfil.')
    } finally {
      setIsUpdatingRole(false)
    }
  }

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus = !user.is_active
    try {
      const { error } = await supabase
        .from('users_profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id)
      
      if (error) throw error
      toast.success(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso!`)
      fetchUsers()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao alterar status do usuário.')
    }
  }

  // O schema RLS atual não permite deletar de users_profiles. Se o Admin quiser bloquear, ele pode mudar o role para algo que não seja "admin" ou "operator", mas o select exige esses. 
  // Na Opção A sugerida no chat, o Admin remove lá pelo Painel. Vamos colocar um aviso.


  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <ShieldOff size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h1>
        <p className="text-gray-500 text-lg max-w-md">
          Apenas administradores podem acessar a tela de configurações. Se você precisa de acesso, fale com o dono do sistema.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-10 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-lg text-gray-500 font-medium mt-1">
          Gerencie sua conta e os acessos da equipe
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ===================== MINHA CONTA ===================== */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
            <User size={24} /> Minha Conta
          </h2>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <form onSubmit={handleUpdateName} className="space-y-4">
              <Input
                label="Seu Nome"
                value={myName}
                onChange={e => setMyName(e.target.value)}
              />
              <button
                type="submit"
                disabled={isSavingName || myName === profile?.name}
                className="w-full sm:w-auto flex items-center justify-center gap-2 h-[52px] px-8 rounded-xl text-[16px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors focus-ring disabled:opacity-70"
              >
                {isSavingName ? <Loader2 size={20} className="animate-spin"/> : <Save size={20} />}
                Salvar nome
              </button>
            </form>

            <hr className="border-gray-100" />

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Segurança</label>
              <button
                onClick={handleResetPassword}
                disabled={isResettingPass}
                className="w-full sm:w-auto flex items-center justify-center gap-2 h-[52px] px-8 rounded-xl text-[16px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors focus-ring disabled:opacity-70"
              >
                {isResettingPass ? <Loader2 size={20} className="animate-spin"/> : <Key size={20} />}
                Redefinir minha senha
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Enviaremos um link para o seu e-mail cadastrado.
              </p>
            </div>
          </div>
        </section>

        {/* ===================== GERENCIAMENTO DE EQUIPE ===================== */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
              <UserCog size={24} /> Acessos da Equipe
            </h2>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            {/* INSTRUÇÃO PARA ADICIONAR */}
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl mb-6 flex gap-3 items-start">
              <Shield className="text-purple-700 shrink-0 mt-0.5" size={24} />
              <div>
                <p className="text-[16px] font-bold text-purple-900 mb-1">Como adicionar um funcionário?</p>
                <p className="text-sm text-purple-800 leading-relaxed">
                  Por segurança, o cadastro de novos e-mails e senhas é feito exclusivamente pelo painel de controle do Banco de dados. Solicite ao TI o cadastro do novo usuário, o nome aparecerá aqui automaticamente para você definir o tipo de conta (Admin, Operador, Vendedor ou Costureiro).
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={32} className="animate-spin text-purple-900" />
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors gap-4">
                    <div>
                      <p className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
                        {user.name}
                        {user.id === profile?.id && <span className="text-xs bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full font-bold">Você</span>}
                      </p>
                      <p className="text-sm text-gray-500 font-medium capitalize mt-0.5">
                        {user.role === 'admin' ? 'Administrador' : 
                         user.role === 'vendedor' ? 'Vendedor (Loja)' :
                         user.role === 'costureiro' ? 'Costureiro' : 'Operador (Geral)'}
                      </p>
                    </div>

                    {user.id !== profile?.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setUserToEdit(user)}
                          className="px-4 py-2 text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors focus-ring"
                        >
                          Mudar Perfil
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors focus-ring ${
                            user.is_active 
                              ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                              : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {user.is_active ? 'Bloquear' : 'Ativar'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>

      {/* Modal Mudar Role */}
      <Dialog.Root open={!!userToEdit} onOpenChange={(o) => !o && !isUpdatingRole && setUserToEdit(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">
              Alterar perfil de acesso
            </Dialog.Title>
            <Dialog.Description className="text-[16px] text-gray-600 mb-6">
              O que o usuário <strong>{userToEdit?.name}</strong> poderá fazer?
            </Dialog.Description>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleUpdateRole(userToEdit!.id, 'admin')}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors focus-ring ${userToEdit?.role === 'admin' ? 'bg-purple-50 border-purple-900' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              >
                <p className="font-bold text-[18px] text-purple-900">Administrador</p>
                <p className="text-sm text-purple-800 mt-1">Acesso total ao sistema, relatórios e configurações.</p>
              </button>

              <button
                onClick={() => handleUpdateRole(userToEdit!.id, 'operador')}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors focus-ring ${userToEdit?.role === 'operador' ? 'bg-gray-50 border-gray-900' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              >
                <p className="font-bold text-[18px] text-gray-900">Operador Geral</p>
                <p className="text-sm text-gray-500 mt-1">Acesso a todos os módulos, exceto Relatórios e Configurações.</p>
              </button>

              <button
                onClick={() => handleUpdateRole(userToEdit!.id, 'vendedor')}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors focus-ring ${userToEdit?.role === 'vendedor' ? 'bg-emerald-50 border-emerald-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              >
                <p className="font-bold text-[18px] text-emerald-900">Vendedor</p>
                <p className="text-sm text-emerald-800 mt-1">Acesso apenas à Loja, Estoque, Clientes e Dashboard.</p>
              </button>

              <button
                onClick={() => handleUpdateRole(userToEdit!.id, 'costureiro')}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors focus-ring ${userToEdit?.role === 'costureiro' ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              >
                <p className="font-bold text-[18px] text-blue-900">Costureiro</p>
                <p className="text-sm text-blue-800 mt-1">Acesso apenas à Costuraria, Clientes e Dashboard.</p>
              </button>
            </div>

            <button
              onClick={() => setUserToEdit(null)}
              disabled={isUpdatingRole}
              className="w-full h-[52px] rounded-xl text-[16px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus-ring"
            >
              Cancelar
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal Aviso Bloqueio */}
      <Dialog.Root open={!!userToBlock} onOpenChange={(o) => !o && setUserToBlock(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6 text-center">
            <div className="mx-auto bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">
              Remover Acesso
            </Dialog.Title>
            <Dialog.Description className="text-[16px] text-gray-600 mb-6">
              Para remover o acesso de <strong>{userToBlock?.name}</strong> definitivamente, você deve deletar a conta de e-mail dele no Painel de Controle do Supabase (Aba Authentication).
            </Dialog.Description>
            <button
              onClick={() => setUserToBlock(null)}
              className="w-full h-[52px] rounded-xl text-[16px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus-ring"
            >
              Entendido
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  )
}
