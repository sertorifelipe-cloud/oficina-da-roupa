import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Search, Users as UsersIcon } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Client } from '@/types/database'
import { ClientCard } from '@/components/clientes/ClientCard'
import { ClientModal } from '@/components/clientes/ClientModal'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'

export function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null)
  
  // Exclusão
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchClients = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })

      if (searchTerm.length >= 2) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setClients(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar clientes:', error)
      toast.error('Não foi possível carregar os clientes.')
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    const delay = setTimeout(fetchClients, 300)
    return () => clearTimeout(delay)
  }, [fetchClients])

  const handleOpenNew = () => {
    setClientToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (client: Client) => {
    setClientToEdit(client)
    setIsModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id)

      if (error) throw error
      
      toast.success('Cliente removido com sucesso!')
      fetchClients()
    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      toast.error('Não foi possível excluir. Ele pode estar vinculado a algum pedido.')
    } finally {
      setIsDeleting(false)
      setClientToDelete(null)
    }
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 h-[52px] px-6 rounded-xl text-[18px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-md focus-ring"
        >
          <Plus size={24} strokeWidth={2.5} />
          Novo cliente
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-2xl">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          <Search size={24} />
        </div>
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-16 pl-14 pr-4 rounded-2xl border border-gray-300 text-lg text-gray-900 bg-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent placeholder:text-gray-400"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-purple-900">
          <Loader2 size={40} className="animate-spin" />
          <p className="text-lg font-medium">Buscando clientes...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 border-dashed py-20 px-4 text-center">
          <div className="bg-gray-100 p-4 rounded-full text-gray-400 mb-4">
            <UsersIcon size={48} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum cliente encontrado</h3>
          <p className="text-gray-500 text-lg max-w-md">
            {searchTerm 
              ? 'Tente buscar com outros termos.'
              : 'Você ainda não tem nenhum cliente cadastrado. Clique em "Novo cliente" para começar.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={handleOpenEdit}
              onDelete={setClientToDelete}
            />
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
          fetchClients()
        }}
        clientToEdit={clientToEdit}
      />

      {/* Dialog Confirmação de Exclusão */}
      <Dialog.Root open={!!clientToDelete} onOpenChange={(o) => !o && setClientToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">
              Excluir cliente
            </Dialog.Title>
            <Dialog.Description className="text-[16px] text-gray-600 mb-6">
              Tem certeza que deseja remover <strong>{clientToDelete?.name}</strong>? Essa ação não pode ser desfeita.
            </Dialog.Description>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setClientToDelete(null)}
                className="w-full h-[52px] rounded-xl text-[16px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus-ring"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 h-[52px] rounded-xl text-[16px] font-bold text-white bg-red-600 hover:bg-red-700 transition-colors focus-ring disabled:opacity-70"
              >
                {isDeleting ? <Loader2 size={20} className="animate-spin" /> : 'Sim, excluir'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
