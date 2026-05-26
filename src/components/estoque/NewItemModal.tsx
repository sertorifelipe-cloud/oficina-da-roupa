import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface NewItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const itemSchema = z.object({
  name: z.string().min(1, 'O nome do item é obrigatório.'),
  category: z.string().optional(),
  unit: z.enum(['un', 'm', 'kg', 'rolo'], {
    message: 'Selecione uma unidade.'
  }),
  min_quantity: z.number().min(0, 'A quantidade mínima não pode ser negativa.'),
  initial_quantity: z.number().min(0, 'A quantidade inicial não pode ser negativa.'),
  base_price: z.number().min(0, 'O preço não pode ser negativo.').optional(),
})

type ItemForm = z.infer<typeof itemSchema>

export function NewItemModal({ isOpen, onClose, onSuccess }: NewItemModalProps) {
  const { profile } = useAuth()
  
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      category: '',
      unit: 'un',
      min_quantity: 5,
      initial_quantity: 0,
      base_price: 0
    }
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        category: '',
        unit: 'un',
        min_quantity: 5,
        initial_quantity: 0,
        base_price: 0
      })
    }
  }, [isOpen, reset])

  async function onSubmit(data: ItemForm) {
    try {
      // 1. Criar o item no estoque
      const { data: insertedItem, error: itemError } = await supabase
        .from('inventory_items')
        .insert([{
          name: data.name,
          category: data.category || null,
          unit: data.unit,
          min_quantity: data.min_quantity,
          current_quantity: 0, // Inicia zerado, a trigger vai atualizar via movimentação
          base_price: data.base_price || 0
        }])
        .select()
        .single()

      if (itemError) throw itemError

      // 2. Se houver quantidade inicial, cria uma movimentação de entrada
      if (data.initial_quantity > 0) {
        const { error: movError } = await supabase
          .from('inventory_movements')
          .insert([{
            item_id: insertedItem.id,
            type: 'entrada',
            quantity: data.initial_quantity,
            reason: 'Estoque inicial',
            created_by: profile?.id
          }])

        if (movError) throw movError
      }

      toast.success('Novo item cadastrado no estoque!')
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar item de estoque:', err)
      toast.error('Ocorreu um erro ao salvar. Tente novamente.')
    }
  }

  const units = [
    { value: 'un', label: 'Unidade' },
    { value: 'm', label: 'Metro' },
    { value: 'kg', label: 'Kg' },
    { value: 'rolo', label: 'Rolo' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Item de Estoque" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        <Input
          label="Nome do Item *"
          placeholder="Ex: Linha Preta, Zíper invisível..."
          {...register('name')}
          error={errors.name?.message}
        />

        <Input
          label="Categoria (Opcional)"
          placeholder="Ex: Aviamentos, Embalagens..."
          {...register('category')}
          error={errors.category?.message}
        />

        {/* Radio Buttons para Unidade */}
        <div className="flex flex-col gap-2">
          <label className="text-lg font-semibold text-gray-800">Unidade de Medida *</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <>
                  {units.map(u => (
                    <label key={u.value} className={`
                      flex items-center justify-center h-14 rounded-xl border-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-purple-900 focus-within:ring-offset-2
                      ${field.value === u.value ? 'bg-purple-50 border-purple-900 text-purple-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
                    `}>
                      <input 
                        type="radio" 
                        value={u.value} 
                        className="sr-only" // esconde o input nativo
                        checked={field.value === u.value}
                        onChange={() => field.onChange(u.value)}
                      />
                      <span className="text-[16px] font-bold">{u.label}</span>
                    </label>
                  ))}
                </>
              )}
            />
          </div>
          {errors.unit && <p className="text-base text-red-600 font-medium">{errors.unit.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            name="initial_quantity"
            control={control}
            render={({ field }) => (
              <Input
                label="Quantidade Inicial"
                type="number"
                step="0.01"
                min="0"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                error={errors.initial_quantity?.message}
              />
            )}
          />

          <Controller
            name="base_price"
            control={control}
            render={({ field }) => (
              <Input
                label="Preço de Venda (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 50.00"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                error={errors.base_price?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            name="min_quantity"
            control={control}
            render={({ field }) => (
              <Input
                label="Quantidade Mínima (Alerta)"
                type="number"
                step="0.01"
                min="0"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                error={errors.min_quantity?.message}
              />
            )}
          />
        </div>

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
              'Cadastrar Item'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
