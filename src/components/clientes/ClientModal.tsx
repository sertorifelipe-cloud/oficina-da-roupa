import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import type { Client } from '@/types/database'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  clientToEdit?: Client | null
}

const clientSchema = z.object({
  name: z.string().min(1, 'O nome do cliente é obrigatório.'),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  notes: z.string().optional()
})

type ClientForm = z.infer<typeof clientSchema>

// Máscara simples para telefone (00) 00000-0000 ou (00) 0000-0000
const formatPhone = (value: string) => {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

export function ClientModal({ isOpen, onClose, onSuccess, clientToEdit }: ClientModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      notes: ''
    }
  })

  // Aplica máscara ao digitar
  const phoneValue = watch('phone')
  useEffect(() => {
    if (phoneValue) {
      const formatted = formatPhone(phoneValue)
      if (formatted !== phoneValue) {
        setValue('phone', formatted)
      }
    }
  }, [phoneValue, setValue])

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        reset({
          name: clientToEdit.name,
          phone: clientToEdit.phone || '',
          email: clientToEdit.email || '',
          notes: clientToEdit.notes || ''
        })
      } else {
        reset({ name: '', phone: '', email: '', notes: '' })
      }
    }
  }, [isOpen, clientToEdit, reset])

  async function onSubmit(data: ClientForm) {
    try {
      if (clientToEdit) {
        const { error } = await supabase
          .from('clients')
          .update(data)
          .eq('id', clientToEdit.id)
        if (error) throw error
        toast.success('Cliente atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([data])
        if (error) throw error
        toast.success('Cliente cadastrado com sucesso!')
      }
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err)
      toast.error('Ocorreu um erro ao salvar. Tente novamente.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        <Input
          label="Nome completo *"
          placeholder="Ex: Maria da Silva"
          {...register('name')}
          error={errors.name?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Telefone (WhatsApp)"
            placeholder="(00) 00000-0000"
            maxLength={15}
            {...register('phone')}
            error={errors.phone?.message}
          />
          
          <Input
            label="E-mail"
            type="email"
            placeholder="cliente@email.com"
            {...register('email')}
            error={errors.email?.message}
          />
        </div>

        <Textarea
          label="Observações"
          placeholder="Alguma anotação importante sobre o cliente?"
          rows={3}
          {...register('notes')}
          error={errors.notes?.message}
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
              clientToEdit ? 'Salvar alterações' : 'Cadastrar cliente'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
