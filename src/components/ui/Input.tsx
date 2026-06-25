import { forwardRef, InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  prefixNode?: ReactNode
  labelClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefixNode, className = '', labelClassName, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        <label htmlFor={id} className={`text-lg font-semibold ${labelClassName || 'text-gray-800'}`}>
          {label}
        </label>
        <div className="relative flex items-center">
          {prefixNode && (
            <div className="absolute left-4 text-gray-500 font-medium">
              {prefixNode}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={[
              'w-full min-h-[52px] h-14 rounded-xl border text-lg text-gray-900 bg-white shadow-sm transition-all',
              'focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent',
              'placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500',
              prefixNode ? 'pl-12 pr-4' : 'px-4',
              error ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400',
              className
            ].join(' ')}
            {...props}
          />
        </div>
        {error && <p className="text-base text-red-600 font-medium">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
