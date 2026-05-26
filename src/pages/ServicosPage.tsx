import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Tag as TagIcon } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Service, ServiceCategory } from '@/types/database'
import { ServiceCard } from '@/components/servicos/ServiceCard'
import { ServiceModal } from '@/components/servicos/ServiceModal'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'

type FilterCategory = ServiceCategory | 'todos'



export function ServicosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter] = useState<FilterCategory>('todos')
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null)
  
  // Exclusão
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchServices = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true })

      if (activeFilter !== 'todos') {
        query = query.eq('category', activeFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setServices(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar serviços:', error)
      toast.error('Não foi possível carregar os serviços.')
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const handleOpenNew = () => {
    setServiceToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (service: Service) => {
    setServiceToEdit(service)
    setIsModalOpen(true)
  }

  const handleToggleActive = async (service: Service) => {
    try {
      const newStatus = !service.active
      const { error } = await supabase
        .from('services')
        .update({ active: newStatus })
        .eq('id', service.id)

      if (error) throw error
      
      toast.success(`Serviço ${newStatus ? 'ativado' : 'inativado'}!`)
      fetchServices()
    } catch (error: any) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar o status do serviço.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceToDelete.id)

      if (error) throw error
      
      toast.success('Serviço removido com sucesso!')
      fetchServices()
    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      toast.error('Não foi possível excluir. Este serviço pode estar vinculado a um pedido ou venda.')
    } finally {
      setIsDeleting(false)
      setServiceToDelete(null)
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Serviços e Produtos</h1>
        <button
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 h-[52px] px-6 rounded-xl text-[18px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-md focus-ring"
        >
          <Plus size={24} strokeWidth={2.5} />
          Novo serviço
        </button>
      </div>



      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-purple-900">
          <Loader2 size={40} className="animate-spin" />
          <p className="text-lg font-medium">Buscando...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 border-dashed py-20 px-4 text-center">
          <div className="bg-gray-100 p-4 rounded-full text-gray-400 mb-4">
            <TagIcon size={48} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum serviço encontrado</h3>
          <p className="text-gray-500 text-lg max-w-md">
            Clique em "Novo serviço" para adicionar os itens que sua loja e costuraria oferecem.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleOpenEdit}
              onDelete={setServiceToDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
          fetchServices()
        }}
        serviceToEdit={serviceToEdit}
      />

      <Dialog.Root open={!!serviceToDelete} onOpenChange={(o) => !o && setServiceToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">
              Excluir Serviço
            </Dialog.Title>
            <Dialog.Description className="text-[16px] text-gray-600 mb-6">
              Tem certeza que deseja remover <strong>{serviceToDelete?.name}</strong>? Essa ação não pode ser desfeita.
            </Dialog.Description>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setServiceToDelete(null)}
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
