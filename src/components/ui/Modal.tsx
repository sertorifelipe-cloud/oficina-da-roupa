import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* Overlay escuro */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        
        {/* Conteúdo do Modal */}
        <Dialog.Content 
          className={[
            'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full',
            'bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            maxWidth
          ].join(' ')}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50">
            <Dialog.Title className="text-xl font-bold text-purple-900">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button 
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-200 text-gray-500 transition-colors focus-ring"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            </Dialog.Close>
          </div>

          {/* Corpo */}
          <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
