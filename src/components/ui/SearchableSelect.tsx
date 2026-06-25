import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

interface SearchableSelectProps {
  label: string
  error?: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  label,
  error,
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  disabled = false,
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Busca a opção selecionada correspondente ao valor atual
  const selectedOption = options.find(opt => opt.value === value)

  // Sincroniza o termo de busca com o item selecionado quando o dropdown fecha ou o valor muda
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedOption ? selectedOption.label : '')
    }
  }, [value, selectedOption, isOpen])

  // Lida com cliques fora do componente para fechar o dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtra as opções com base no termo digitado
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (optValue: string) => {
    onChange(optValue)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setSearchTerm(text)
    if (!isOpen) {
      setIsOpen(true)
    }
    // Se o usuário limpar o input, removemos a seleção
    if (text === '') {
      onChange('')
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
  }

  const handleClear = () => {
    setSearchTerm('')
    onChange('')
    setIsOpen(false)
  }

  return (
    <div className={`relative flex flex-col gap-2 w-full ${className}`} ref={dropdownRef}>
      <label className="text-lg font-semibold text-gray-800">
        {label}
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-4 text-gray-400">
          <Search size={20} />
        </div>
        <input
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          className={[
            'w-full min-h-[52px] h-14 pl-12 pr-10 rounded-xl border text-lg text-gray-900 bg-white shadow-sm transition-all',
            'focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent',
            'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
            error ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400',
          ].join(' ')}
        />
        {value && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        ) : (
          <div className="absolute right-4 text-gray-400 pointer-events-none">
            <ChevronDown size={20} />
          </div>
        )}
      </div>
      {error && <p className="text-base text-red-600 font-medium">{error}</p>}

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={[
                    'w-full text-left px-4 py-3 text-[16px] transition-colors border-b border-gray-100 last:border-0 flex items-center justify-between',
                    isSelected 
                      ? 'bg-purple-900 text-white font-semibold' 
                      : 'hover:bg-purple-50 text-gray-900'
                  ].join(' ')}
                >
                  <span>{opt.label}</span>
                </button>
              )
            })
          ) : (
            <div className="px-4 py-3 text-gray-500 text-[16px] italic">
              Nenhum item encontrado
            </div>
          )}
        </div>
      )}
    </div>
  )
}
