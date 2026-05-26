import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import type { Service } from '@/types/database'

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  serviceToEdit?: Service | null
}

const serviceSchema = z.object({
  name: z.string().min(1, 'O nome do serviço é obrigatório.'),
  category: z.enum(['costuraria', 'loja'], {
    message: 'Selecione uma categoria.'
  }),
  base_price: z.number().min(0, 'O preço não pode ser negativo.'),
  description: z.string().optional(),
  active: z.boolean()
})

type ServiceForm = z.infer<typeof serviceSchema>

export function ServiceModal({ isOpen, onClose, onSuccess, serviceToEdit }: ServiceModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      category: 'costuraria',
      base_price: 0,
      description: '',
      active: true
    }
  })

  useEffect(() => {
    if (isOpen) {
      if (serviceToEdit) {
        reset({
          name: serviceToEdit.name,
          category: serviceToEdit.category || 'costuraria',
          base_price: serviceToEdit.base_price || 0,
          description: serviceToEdit.description || '',
          active: serviceToEdit.active
        })
      } else {
        reset({
          name: '',
          category: 'costuraria',
          base_price: 0,
          description: '',
          active: true
        })
      }
    }
  }, [isOpen, serviceToEdit, reset])

  async function onSubmit(data: ServiceForm) {
    try {
      if (serviceToEdit) {
        const { error } = await supabase
          .from('services')
          .update(data)
          .eq('id', serviceToEdit.id)
        if (error) throw error
        toast.success('Serviço atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('services')
          .insert([data])
        if (error) throw error
        toast.success('Serviço cadastrado com sucesso!')
      }
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar serviço:', err)
      toast.error('Ocorreu um erro ao salvar. Tente novamente.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={serviceToEdit ? 'Editar Serviço / Produto' : 'Novo Serviço / Produto'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        <Input
          label="Nome do serviço ou produto *"
          placeholder="Ex: Barra simples, Camiseta Branca..."
          {...register('name')}
          error={errors.name?.message}
        />



        <Controller
          name="base_price"
          control={control}
          render={({ field }) => (
            <Input
              label="Preço base"
              type="number"
              step="0.01"
              min="0"
              prefixNode={<span className="font-bold text-gray-600">R$</span>}
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              error={errors.base_price?.message}
            />
          )}
        />

        <Textarea
          label="Descrição"
          placeholder="Opcional. Descreva detalhes do serviço ou produto."
          rows={2}
          {...register('description')}
          error={errors.description?.message}
        />

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-6 mt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-14 px-8 rounded-xl text-[18px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus-ring"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 h-14 px-8 rounded-xl text-[18px] font-bold text-white bg-purple-900 hover:bg-purple-800 transition-colors shadow-md focus-ring disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                Salvando...
              </>
            ) : (
              serviceToEdit ? 'Salvar alterações' : 'Cadastrar'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
